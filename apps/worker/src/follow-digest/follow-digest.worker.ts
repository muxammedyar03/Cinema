import {
	buildDigestJobData,
	cinemaDigestJobOptions,
	FOLLOW_DIGEST_JOB,
	FOLLOW_DIGEST_QUEUE,
	type FollowDigestJobData,
} from "@cinema/queue-contracts";
import { type Job, Queue, Worker } from "bullmq";
import { redisConnectionFromUrl, workerConfig } from "../config.js";
import { prisma } from "../db.js";
import { TELEGRAM_NOTIFY_QUEUE, type TelegramNotifyJobPayload } from "../telegram-notify.worker.js";
import { createPrismaDigestStore } from "./prisma-digest-store.js";
import { DIGEST_JOB_NAME, runCinemaDigest } from "./run-cinema-digest.js";

/** Stamp for `Session.notifiedAt` — deterministic per job so retries reuse the same window. */
export function digestStamp(job: Pick<Job<FollowDigestJobData>, "data" | "timestamp" | "opts">) {
	const ms = job.data.windowEndsAt ?? job.timestamp + (job.opts.delay ?? 0);
	return new Date(ms);
}

export function startFollowDigestWorker(): { close: () => Promise<void> } {
	const connection = redisConnectionFromUrl(workerConfig.redisUrl);
	const notifyQueue = new Queue<TelegramNotifyJobPayload>(TELEGRAM_NOTIFY_QUEUE, {
		connection,
		defaultJobOptions: {
			attempts: 5,
			backoff: { type: "exponential", delay: 2000 },
			removeOnComplete: 1000,
			removeOnFail: 5000,
		},
	});
	const digestQueue = new Queue<FollowDigestJobData>(FOLLOW_DIGEST_QUEUE, { connection });
	const store = createPrismaDigestStore(prisma);

	const worker = new Worker<FollowDigestJobData>(
		FOLLOW_DIGEST_QUEUE,
		async (job) => {
			const result = await runCinemaDigest(
				{
					store,
					sendQueue: {
						async enqueueMany(jobs) {
							await notifyQueue.addBulk(
								jobs.map((data) => ({ name: DIGEST_JOB_NAME, data, opts: { jobId: data.jobId } })),
							);
						},
					},
					scheduler: {
						async schedule(cinemaId, deepLink) {
							const windowMs = workerConfig.followNotifyDebounceMs;
							await digestQueue.add(
								FOLLOW_DIGEST_JOB,
								buildDigestJobData(cinemaId, deepLink, windowMs),
								cinemaDigestJobOptions(cinemaId, windowMs),
							);
						},
					},
				},
				{
					cinemaId: job.data.cinemaId,
					deepLink: job.data.deepLink,
					stamp: digestStamp(job),
					now: new Date(),
				},
			);
			return result;
		},
		{ connection, concurrency: 2 },
	);

	worker.on("error", (err) => {
		console.error(`follow-digest worker error: ${err.message}`, err.stack);
	});
	worker.on("failed", (job, err) => {
		console.warn(`follow-digest failed ${job?.id}: ${err.message}`);
	});
	worker.on("completed", (job, result) => {
		console.log(`follow-digest ${job.data.cinemaId} done ${JSON.stringify(result)}`);
	});

	return {
		async close() {
			await worker.close();
			await Promise.all([notifyQueue.close(), digestQueue.close()]);
		},
	};
}
