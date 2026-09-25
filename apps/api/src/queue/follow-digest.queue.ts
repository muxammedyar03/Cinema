import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import {
	buildDigestJobData,
	cinemaDigestJobOptions,
	cinemaDigestKey,
	FOLLOW_DIGEST_JOB,
	FOLLOW_DIGEST_QUEUE,
	type FollowDigestJobData,
	resolveDebounceMs,
} from "./follow-digest.options";
import { redisConnectionFromUrl } from "./telegram-notify.queue";

/** KAN-35: schedules the debounced per-cinema follow digest (consumed by apps/worker). */
@Injectable()
export class FollowDigestQueue implements OnModuleDestroy {
	private readonly log = new Logger(FollowDigestQueue.name);
	private readonly queue: Queue<FollowDigestJobData, unknown, typeof FOLLOW_DIGEST_JOB>;
	readonly windowMs: number;

	constructor(config: ConfigService) {
		const url = config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
		this.windowMs = resolveDebounceMs(config.get<string>("FOLLOW_NOTIFY_DEBOUNCE_MS"));
		this.queue = new Queue(FOLLOW_DIGEST_QUEUE, { connection: redisConnectionFromUrl(url) });
	}

	/** Idempotent within the window: repeated calls for the same cinema are deduplicated. */
	async scheduleCinemaDigest(cinemaId: string, deepLink: string): Promise<void> {
		await this.queue.add(
			FOLLOW_DIGEST_JOB,
			buildDigestJobData(cinemaId, deepLink, this.windowMs),
			cinemaDigestJobOptions(cinemaId, this.windowMs),
		);
		this.log.debug(`Scheduled ${cinemaDigestKey(cinemaId)} in ${this.windowMs}ms`);
	}

	async onModuleDestroy() {
		await this.queue.close();
	}
}
