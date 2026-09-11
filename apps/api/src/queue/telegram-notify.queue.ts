import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type ConnectionOptions, Queue } from "bullmq";

export const TELEGRAM_NOTIFY_QUEUE = "telegram-notify";

export type TelegramNotifyJobName =
	| "notify.cinema.session_published"
	| "notify.cinema.afisha_digest";

export type TelegramNotifyJobPayload = {
	jobId: string;
	notificationId: string;
	userId: string;
	telegramId: string;
	locale: string;
	template: "cinema_session_published" | "cinema_afisha_digest";
	text: string;
	replyMarkup?: {
		inline_keyboard: Array<Array<{ text: string; url: string }>>;
	};
	idempotencyKey: string;
};

@Injectable()
export class TelegramNotifyQueue implements OnModuleDestroy {
	private readonly log = new Logger(TelegramNotifyQueue.name);
	private readonly queue: Queue<TelegramNotifyJobPayload, void, TelegramNotifyJobName>;

	constructor(config: ConfigService) {
		const url = config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
		const connection = redisConnectionFromUrl(url);
		this.queue = new Queue(TELEGRAM_NOTIFY_QUEUE, {
			connection,
			defaultJobOptions: {
				attempts: 5,
				backoff: { type: "exponential", delay: 2000 },
				removeOnComplete: 1000,
				removeOnFail: 5000,
			},
		});
	}

	async enqueue(name: TelegramNotifyJobName, payload: TelegramNotifyJobPayload): Promise<void> {
		await this.queue.add(name, payload, {
			jobId: payload.idempotencyKey,
		});
		this.log.debug(`Enqueued ${name} ${payload.idempotencyKey}`);
	}

	async onModuleDestroy() {
		await this.queue.close();
	}
}

export function redisConnectionFromUrl(url: string): ConnectionOptions {
	const parsed = new URL(url);
	return {
		host: parsed.hostname,
		port: Number(parsed.port || 6379),
		username: parsed.username || undefined,
		password: parsed.password || undefined,
		maxRetriesPerRequest: null,
	};
}
