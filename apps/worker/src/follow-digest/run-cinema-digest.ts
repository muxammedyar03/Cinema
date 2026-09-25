import type { TelegramNotifyJobPayload } from "../telegram-notify.worker.js";
import { toBullJobId } from "./follow-digest.options.js";
import {
	DIGEST_BUTTON_TEXT,
	type DigestSessionInput,
	formatAfishaDigestRu,
} from "./format-afisha-digest.js";

export const DIGEST_NOTIFICATION_TYPE = "CINEMA_AFISHA_DIGEST";
export const DIGEST_JOB_NAME = "notify.cinema.afisha_digest";
const ENQUEUE_CHUNK = 200;

export type DigestSession = DigestSessionInput & {
	id: string;
	status: string;
};

export type DigestFollower = { userId: string; telegramId: string | null };

export type DigestNotification = { id: string; userId: string; status: string };

export type DigestNotificationPayload = {
	cinemaId: string;
	cinemaName: string;
	windowKey: string;
	sessions: Array<{ sessionId: string; movieId: string; movieTitle: string; startsAt: string }>;
	deepLink: string;
	locale: "ru";
	idempotencyKey: string;
	text: string;
};

/** Persistence port (Prisma adapter in prisma-digest-store.ts, in-memory fake in tests). */
export interface DigestStore {
	/** Sessions of the cinema already stamped with this window (`notifiedAt = stamp`). */
	findSessionsStampedAt(cinemaId: string, stamp: Date): Promise<DigestSession[]>;
	/**
	 * Atomically stamp `notifiedAt = stamp` on sessions with
	 * `cinemaId`, `status = PUBLISHED`, `notifiedAt IS NULL`, `startsAt >= now`.
	 */
	claimPendingSessions(cinemaId: string, stamp: Date, now: Date): Promise<number>;
	/** Same filter as claim, count only. */
	countPendingSessions(cinemaId: string, now: Date): Promise<number>;
	getCinemaName(cinemaId: string): Promise<string | null>;
	listFollowers(cinemaId: string): Promise<DigestFollower[]>;
	findDigestNotifications(windowKey: string): Promise<DigestNotification[]>;
	createDigestNotification(
		userId: string,
		payload: DigestNotificationPayload,
	): Promise<DigestNotification>;
	markNotificationFailed(
		id: string,
		payload: DigestNotificationPayload,
		failReason: string,
	): Promise<void>;
}

/** Enqueues per-follower send jobs on `telegram-notify` (jobId = sanitized idempotencyKey). */
export interface DigestSendQueue {
	enqueueMany(jobs: TelegramNotifyJobPayload[]): Promise<void>;
}

/** Re-schedules the per-cinema debounce job (same dedup key). */
export interface DigestScheduler {
	schedule(cinemaId: string, deepLink: string): Promise<void>;
}

export type RunCinemaDigestInput = {
	cinemaId: string;
	deepLink: string;
	/** Deterministic per job (window end) — stable across BullMQ retries. */
	stamp: Date;
	now: Date;
};

export type RunCinemaDigestResult = {
	sessions: number;
	followers: number;
	enqueued: number;
	skippedAlreadySent: number;
	noTelegram: number;
	rescheduled: boolean;
};

export function digestWindowKey(cinemaId: string, stamp: Date): string {
	return `${cinemaId}:${stamp.getTime()}`;
}

export function digestIdempotencyKey(cinemaId: string, stamp: Date, userId: string): string {
	return `notify:afisha.digest:${digestWindowKey(cinemaId, stamp)}:${userId}`;
}

/**
 * Debounced per-cinema digest (KAN-35).
 *
 * 1. Claim: stamp every still-PUBLISHED, not-yet-notified future session of the cinema with
 *    `notifiedAt = stamp`. On retry the already-stamped set is reused, so the set of sessions
 *    in one window never changes between attempts.
 * 2. Build one message and one `CINEMA_AFISHA_DIGEST` Notification per follower
 *    (idempotent by `windowKey`), enqueue one send job per follower.
 * 3. If sessions remain unclaimed (published during a retry/backoff), schedule the next window.
 */
export async function runCinemaDigest(
	deps: { store: DigestStore; sendQueue: DigestSendQueue; scheduler: DigestScheduler },
	input: RunCinemaDigestInput,
): Promise<RunCinemaDigestResult> {
	const { store, scheduler } = deps;
	const { cinemaId, deepLink, stamp, now } = input;
	const result: RunCinemaDigestResult = {
		sessions: 0,
		followers: 0,
		enqueued: 0,
		skippedAlreadySent: 0,
		noTelegram: 0,
		rescheduled: false,
	};

	let owned = await store.findSessionsStampedAt(cinemaId, stamp);
	if (owned.length === 0) {
		await store.claimPendingSessions(cinemaId, stamp, now);
		owned = await store.findSessionsStampedAt(cinemaId, stamp);
	}
	// Cancelled (or otherwise un-published) before this attempt → never shown.
	const sessions = owned.filter((s) => s.status === "PUBLISHED");
	result.sessions = sessions.length;

	if (sessions.length > 0) {
		const cinemaName = await store.getCinemaName(cinemaId);
		if (cinemaName !== null) {
			await fanOut(deps, input, cinemaName, sessions, result);
		}
	}

	if ((await store.countPendingSessions(cinemaId, now)) > 0) {
		await scheduler.schedule(cinemaId, deepLink);
		result.rescheduled = true;
	}
	return result;
}

async function fanOut(
	deps: { store: DigestStore; sendQueue: DigestSendQueue },
	input: RunCinemaDigestInput,
	cinemaName: string,
	sessions: DigestSession[],
	result: RunCinemaDigestResult,
): Promise<void> {
	const { store, sendQueue } = deps;
	const { cinemaId, deepLink, stamp, now } = input;
	const windowKey = digestWindowKey(cinemaId, stamp);
	const text = formatAfishaDigestRu({ cinemaName, sessions, now });
	const replyMarkup = { inline_keyboard: [[{ text: DIGEST_BUTTON_TEXT, url: deepLink }]] };
	const sessionPayload = [...sessions]
		.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
		.map((s) => ({
			sessionId: s.id,
			movieId: s.movieId,
			movieTitle: s.movieTitle,
			startsAt: s.startsAt.toISOString(),
		}));

	const followers = await store.listFollowers(cinemaId);
	result.followers = followers.length;
	const existing = new Map(
		(await store.findDigestNotifications(windowKey)).map((n) => [n.userId, n]),
	);

	let batch: TelegramNotifyJobPayload[] = [];
	for (const follower of followers) {
		const idempotencyKey = digestIdempotencyKey(cinemaId, stamp, follower.userId);
		const payload: DigestNotificationPayload = {
			cinemaId,
			cinemaName,
			windowKey,
			sessions: sessionPayload,
			deepLink,
			locale: "ru",
			idempotencyKey,
			text,
		};
		const prior = existing.get(follower.userId);
		if (prior?.status === "SENT") {
			result.skippedAlreadySent += 1;
			continue;
		}
		const notification = prior ?? (await store.createDigestNotification(follower.userId, payload));
		if (!follower.telegramId) {
			await store.markNotificationFailed(notification.id, payload, "NO_TELEGRAM");
			result.noTelegram += 1;
			continue;
		}
		batch.push({
			jobId: toBullJobId(idempotencyKey),
			notificationId: notification.id,
			userId: follower.userId,
			telegramId: follower.telegramId,
			locale: "ru",
			template: "cinema_afisha_digest",
			text,
			replyMarkup,
			idempotencyKey,
		});
		if (batch.length >= ENQUEUE_CHUNK) {
			await sendQueue.enqueueMany(batch);
			result.enqueued += batch.length;
			batch = [];
		}
	}
	if (batch.length > 0) {
		await sendQueue.enqueueMany(batch);
		result.enqueued += batch.length;
	}
}
