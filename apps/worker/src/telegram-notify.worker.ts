import { type Job, Worker } from "bullmq";
import { redisConnectionFromUrl, workerConfig } from "./config.js";
import { prisma } from "./db.js";
import { sendTelegramMessage } from "./telegram.js";

export const TELEGRAM_NOTIFY_QUEUE = "telegram-notify";

export type TelegramNotifyJobPayload = {
	jobId: string;
	notificationId: string;
	userId: string;
	telegramId: string;
	locale: string;
	template: string;
	text: string;
	replyMarkup?: {
		inline_keyboard: Array<Array<{ text: string; url: string }>>;
	};
	idempotencyKey: string;
};

export function startTelegramNotifyWorker(): Worker<TelegramNotifyJobPayload> {
	const connection = redisConnectionFromUrl(workerConfig.redisUrl);
	const worker = new Worker<TelegramNotifyJobPayload>(
		TELEGRAM_NOTIFY_QUEUE,
		async (job) => processJob(job),
		{
			connection,
			concurrency: 5,
			limiter: { max: 25, duration: 1000 },
		},
	);

	worker.on("failed", (job, err) => {
		console.warn(`telegram-notify failed ${job?.id}: ${err.message}`);
	});
	worker.on("completed", (job) => {
		console.log(`telegram-notify sent ${job.id}`);
	});

	return worker;
}

async function processJob(job: Job<TelegramNotifyJobPayload>): Promise<void> {
	const data = job.data;
	const notification = await prisma.notification.findUnique({
		where: { id: data.notificationId },
	});
	if (!notification) {
		console.warn(`Notification ${data.notificationId} missing — skip`);
		return;
	}
	if (notification.status === "SENT") {
		return;
	}

	if (!workerConfig.botToken) {
		await prisma.notification.update({
			where: { id: notification.id },
			data: {
				status: "FAILED",
				payload: {
					...(notification.payload as object),
					failReason: "BOT_TOKEN_UNCONFIGURED",
				},
			},
		});
		throw new Error("TELEGRAM_BOT_TOKEN unconfigured");
	}

	if (!data.telegramId) {
		await prisma.notification.update({
			where: { id: notification.id },
			data: {
				status: "FAILED",
				payload: {
					...(notification.payload as object),
					failReason: "NO_TELEGRAM",
				},
			},
		});
		return;
	}

	const result = await sendTelegramMessage({
		token: workerConfig.botToken,
		chatId: data.telegramId,
		text: data.text,
		replyMarkup: data.replyMarkup,
	});

	if (!result.ok) {
		await prisma.notification.update({
			where: { id: notification.id },
			data: {
				status: "FAILED",
				payload: {
					...(notification.payload as object),
					failReason: result.description,
				},
			},
		});
		if (result.retryable) {
			throw new Error(result.description);
		}
		return;
	}

	await prisma.notification.update({
		where: { id: notification.id },
		data: { status: "SENT", sentAt: new Date() },
	});
}
