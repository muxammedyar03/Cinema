import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { TelegramNotifyJobPayload } from "../../telegram-notify.worker.js";
import {
	type DigestNotificationPayload,
	type DigestStore,
	runCinemaDigest,
} from "../run-cinema-digest.js";

type FakeSession = {
	id: string;
	cinemaId: string;
	movieId: string;
	movieTitle: string;
	startsAt: Date;
	status: string;
	notifiedAt: Date | null;
};
type FakeNotification = {
	id: string;
	userId: string;
	status: string;
	payload: DigestNotificationPayload & { failReason?: string };
};

const CINEMA = "cin_1";
const DEEP_LINK = "https://mini.example.com?startapp=cinema_cin_1";
const NOW = new Date("2026-09-26T04:00:00.000Z");
const STAMP = new Date("2026-09-26T04:05:00.000Z");

/** In-memory stand-in for Postgres with the same filter semantics as the Prisma adapter. */
class FakeDb implements DigestStore {
	sessions: FakeSession[] = [];
	notifications: FakeNotification[] = [];
	followers: Array<{ userId: string; telegramId: string | null }> = [];
	cinemaName: string | null = "Navoiy Cinema";
	private seq = 0;

	private isPending(s: FakeSession, cinemaId: string, now: Date) {
		return (
			s.cinemaId === cinemaId &&
			s.status === "PUBLISHED" &&
			s.notifiedAt === null &&
			s.startsAt.getTime() >= now.getTime()
		);
	}
	async findSessionsStampedAt(cinemaId: string, stamp: Date) {
		return this.sessions
			.filter((s) => s.cinemaId === cinemaId && s.notifiedAt?.getTime() === stamp.getTime())
			.map(({ id, movieId, movieTitle, startsAt, status }) => ({
				id,
				movieId,
				movieTitle,
				startsAt,
				status,
			}));
	}
	async claimPendingSessions(cinemaId: string, stamp: Date, now: Date) {
		let n = 0;
		for (const s of this.sessions) {
			if (this.isPending(s, cinemaId, now)) {
				s.notifiedAt = stamp;
				n += 1;
			}
		}
		return n;
	}
	async countPendingSessions(cinemaId: string, now: Date) {
		return this.sessions.filter((s) => this.isPending(s, cinemaId, now)).length;
	}
	async getCinemaName() {
		return this.cinemaName;
	}
	async listFollowers() {
		return this.followers;
	}
	async findDigestNotifications(windowKey: string) {
		return this.notifications
			.filter((n) => n.payload.windowKey === windowKey)
			.map(({ id, userId, status }) => ({ id, userId, status }));
	}
	async createDigestNotification(userId: string, payload: DigestNotificationPayload) {
		const n = { id: `ntf_${++this.seq}`, userId, status: "PENDING", payload };
		this.notifications.push(n);
		return { id: n.id, userId, status: n.status };
	}
	async markNotificationFailed(id: string, payload: DigestNotificationPayload, failReason: string) {
		const n = this.notifications.find((x) => x.id === id);
		if (n) {
			n.status = "FAILED";
			n.payload = { ...payload, failReason };
		}
	}
}

/** Mimics BullMQ: a job with an existing jobId is a no-op. Optional failure injection. */
class FakeSendQueue {
	jobs = new Map<string, TelegramNotifyJobPayload>();
	addCalls = 0;
	failOnCall: number | null = null;
	async enqueueMany(jobs: TelegramNotifyJobPayload[]) {
		this.addCalls += 1;
		if (this.failOnCall === this.addCalls) throw new Error("redis down");
		for (const j of jobs) {
			assert.ok(!j.jobId.includes(":"), "BullMQ custom ids must not contain ':'");
			if (!this.jobs.has(j.jobId)) this.jobs.set(j.jobId, j);
		}
	}
}

/** Simulates the telegram-notify worker: sends once per job, marks Notification SENT. */
function deliverAll(
	db: FakeDb,
	queue: FakeSendQueue,
	sent: Array<{ chatId: string; text: string }>,
) {
	for (const job of queue.jobs.values()) {
		const n = db.notifications.find((x) => x.id === job.notificationId);
		if (!n || n.status === "SENT") continue;
		sent.push({ chatId: job.telegramId, text: job.text });
		n.status = "SENT";
	}
}

function session(i: number, over: Partial<FakeSession> = {}): FakeSession {
	return {
		id: `ses_${i}`,
		cinemaId: CINEMA,
		movieId: `mov_${i % 3}`,
		movieTitle: ["Дюна 2", "Бэтмен", "Оппенгеймер"][i % 3],
		startsAt: new Date(Date.UTC(2026, 8, 26, 6 + i, 0)),
		status: "PUBLISHED",
		notifiedAt: null,
		...over,
	};
}

describe("runCinemaDigest", () => {
	let db: FakeDb;
	let queue: FakeSendQueue;
	let scheduled: string[];
	const deps = () => ({
		store: db,
		sendQueue: queue,
		scheduler: {
			schedule: async (cinemaId: string) => {
				scheduled.push(cinemaId);
			},
		},
	});
	const input = { cinemaId: CINEMA, deepLink: DEEP_LINK, stamp: STAMP, now: NOW };

	beforeEach(() => {
		db = new FakeDb();
		queue = new FakeSendQueue();
		scheduled = [];
		db.followers = [
			{ userId: "usr_a", telegramId: "111" },
			{ userId: "usr_b", telegramId: "222" },
			{ userId: "usr_c", telegramId: "333" },
		];
	});

	it("10 published sessions → exactly 1 message per follower", async () => {
		db.sessions = Array.from({ length: 10 }, (_, i) => session(i));
		const res = await runCinemaDigest(deps(), input);

		assert.equal(res.sessions, 10);
		assert.equal(res.enqueued, 3);
		const jobs = [...queue.jobs.values()];
		assert.deepEqual(jobs.map((j) => j.telegramId).sort(), ["111", "222", "333"]);
		for (const j of jobs) {
			assert.equal(j.template, "cinema_afisha_digest");
			assert.ok(j.text.startsWith("<b>Navoiy Cinema</b> — Новые сеансы"));
			assert.equal(j.text.split("\n").length, 1 + 3); // 3 distinct films
			assert.deepEqual(j.replyMarkup, {
				inline_keyboard: [[{ text: "Открыть афишу", url: DEEP_LINK }]],
			});
		}
		// one Notification row per follower, all 10 sessions in its payload
		assert.equal(db.notifications.length, 3);
		for (const n of db.notifications) {
			assert.equal(n.payload.sessions.length, 10);
			assert.equal(n.payload.windowKey, `${CINEMA}:${STAMP.getTime()}`);
		}
		assert.ok(db.sessions.every((s) => s.notifiedAt?.getTime() === STAMP.getTime()));
		assert.equal(res.rescheduled, false);
	});

	it("skips sessions that were already notified in an earlier digest", async () => {
		const earlier = new Date("2026-09-25T10:00:00.000Z");
		db.sessions = [session(0, { notifiedAt: earlier }), session(1)];
		await runCinemaDigest(deps(), input);

		for (const n of db.notifications) {
			assert.deepEqual(
				n.payload.sessions.map((s) => s.sessionId),
				["ses_1"],
			);
		}
		assert.equal(db.sessions[0].notifiedAt, earlier);
	});

	it("excludes sessions cancelled inside the window (and does not stamp them)", async () => {
		db.sessions = [
			session(0),
			session(1, { status: "CANCELLED" }),
			session(2, { status: "DRAFT" }),
		];
		await runCinemaDigest(deps(), input);

		const job = [...queue.jobs.values()][0];
		assert.ok(job.text.includes("Дюна 2"));
		assert.ok(!job.text.includes("Бэтмен"));
		assert.ok(!job.text.includes("Оппенгеймер"));
		assert.equal(db.sessions[1].notifiedAt, null);
		assert.equal(db.sessions[2].notifiedAt, null);
	});

	it("drops a session cancelled between attempts even though it was claimed", async () => {
		db.sessions = [session(0), session(1)];
		queue.failOnCall = 1;
		await assert.rejects(runCinemaDigest(deps(), input));
		db.sessions[1].status = "CANCELLED";
		queue.failOnCall = null;
		await runCinemaDigest(deps(), input);
		const texts = [...queue.jobs.values()].map((j) => j.text);
		assert.ok(texts.every((t) => !t.includes("Бэтмен")));
	});

	it("sends nothing when every session is cancelled / none pending", async () => {
		db.sessions = [session(0, { status: "CANCELLED" })];
		const res = await runCinemaDigest(deps(), input);
		assert.equal(res.enqueued, 0);
		assert.equal(queue.jobs.size, 0);
		assert.equal(db.notifications.length, 0);
	});

	it("retry after delivery does not double-send", async () => {
		db.sessions = Array.from({ length: 10 }, (_, i) => session(i));
		const sent: Array<{ chatId: string; text: string }> = [];

		await runCinemaDigest(deps(), input);
		deliverAll(db, queue, sent);
		// BullMQ retries the same job (same stamp) — e.g. worker crashed before ack
		const retry = await runCinemaDigest(deps(), input);
		deliverAll(db, queue, sent);

		assert.equal(sent.length, 3);
		assert.equal(retry.enqueued, 0);
		assert.equal(retry.skippedAlreadySent, 3);
		assert.equal(db.notifications.length, 3);
	});

	it("retry after a partial failure keeps the same session set and one message per follower", async () => {
		db.sessions = Array.from({ length: 4 }, (_, i) => session(i));
		queue.failOnCall = 1;
		await assert.rejects(runCinemaDigest(deps(), input));
		// A new session is published while the job waits for its retry
		db.sessions.push(session(9));
		queue.failOnCall = null;

		const res = await runCinemaDigest(deps(), input);
		const sent: Array<{ chatId: string; text: string }> = [];
		deliverAll(db, queue, sent);

		assert.equal(sent.length, 3);
		assert.equal(db.notifications.length, 3);
		for (const n of db.notifications) assert.equal(n.payload.sessions.length, 4);
		// the late session is left for the next window, which is scheduled
		assert.equal(db.sessions[4].notifiedAt, null);
		assert.equal(res.rescheduled, true);
		assert.deepEqual(scheduled, [CINEMA]);
	});

	it("a second digest window only sends the new sessions", async () => {
		db.sessions = [session(0)];
		await runCinemaDigest(deps(), input);
		const sent: Array<{ chatId: string; text: string }> = [];
		deliverAll(db, queue, sent);

		db.sessions.push(session(1));
		const nextStamp = new Date(STAMP.getTime() + 300_000);
		await runCinemaDigest(deps(), { ...input, stamp: nextStamp });
		deliverAll(db, queue, sent);

		assert.equal(sent.length, 6);
		const second = sent.slice(3).map((m) => m.text);
		assert.ok(second.every((t) => t.includes("Бэтмен") && !t.includes("Дюна 2")));
	});

	it("marks followers without telegramId as FAILED NO_TELEGRAM without enqueueing", async () => {
		db.followers = [
			{ userId: "usr_a", telegramId: "111" },
			{ userId: "usr_x", telegramId: null },
		];
		db.sessions = [session(0)];
		const res = await runCinemaDigest(deps(), input);
		assert.equal(res.enqueued, 1);
		assert.equal(res.noTelegram, 1);
		const failed = db.notifications.find((n) => n.userId === "usr_x");
		assert.equal(failed?.status, "FAILED");
		assert.equal(failed?.payload.failReason, "NO_TELEGRAM");
	});

	it("ignores past sessions (startsAt < now)", async () => {
		db.sessions = [session(0, { startsAt: new Date(NOW.getTime() - 60_000) }), session(1)];
		await runCinemaDigest(deps(), input);
		assert.equal(db.sessions[0].notifiedAt, null);
		assert.equal(db.notifications[0].payload.sessions.length, 1);
	});
});
