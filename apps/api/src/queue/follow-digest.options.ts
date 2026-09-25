/**
 * Follow digest queue contract (KAN-35).
 * Keep in sync with apps/worker/src/follow-digest/follow-digest.options.ts (same pattern as the
 * duplicated `telegram-notify` constants between API and worker).
 */
import type { JobsOptions } from "bullmq";

export const FOLLOW_DIGEST_QUEUE = "follow-digest";
export const FOLLOW_DIGEST_JOB = "notify.cinema.digest_flush";
export const DEFAULT_FOLLOW_NOTIFY_DEBOUNCE_MS = 300_000;

export type FollowDigestJobData = {
	cinemaId: string;
	/** Mini App link for «Открыть афишу» — built by the API with the existing startapp scheme. */
	deepLink: string;
	/** Epoch ms when the window was scheduled to close (used as `Session.notifiedAt` stamp). */
	windowEndsAt: number;
};

/** Deterministic per-cinema debounce key. */
export function cinemaDigestKey(cinemaId: string): string {
	return `notify:cinema:${cinemaId}`;
}

export function resolveDebounceMs(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === "") return DEFAULT_FOLLOW_NOTIFY_DEBOUNCE_MS;
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_FOLLOW_NOTIFY_DEBOUNCE_MS;
}

/**
 * Delayed job + BullMQ deduplication:
 * - `delay` = window: first publish opens the window, digest fires when it closes.
 * - `deduplication.id` = `notify:cinema:{cinemaId}`: further publishes while the job is
 *   delayed/waiting are ignored (they are picked up by the DB query at run time).
 * - `keepLastIfActive`: a publish while the digest is *running* is not lost — BullMQ
 *   creates exactly one follow-up delayed job when the active one finishes.
 */
export function cinemaDigestJobOptions(cinemaId: string, windowMs: number): JobsOptions {
	return {
		delay: windowMs,
		deduplication: { id: cinemaDigestKey(cinemaId), keepLastIfActive: true },
		attempts: 5,
		backoff: { type: "exponential", delay: 2000 },
		removeOnComplete: 1000,
		removeOnFail: 5000,
	};
}

export function buildDigestJobData(
	cinemaId: string,
	deepLink: string,
	windowMs: number,
	now = Date.now(),
): FollowDigestJobData {
	return { cinemaId, deepLink, windowEndsAt: now + windowMs };
}

/** BullMQ rejects custom ids containing `:` (unless exactly 3 segments). */
export function toBullJobId(key: string): string {
	return key.replace(/:/g, ".");
}
