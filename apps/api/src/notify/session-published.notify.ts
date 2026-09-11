import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { type TelegramNotifyJobPayload, TelegramNotifyQueue } from "../queue/telegram-notify.queue";

const CHUNK = 200;
const TYPE = "CINEMA_SESSION_PUBLISHED";

@Injectable()
export class SessionPublishedNotifyService {
	private readonly log = new Logger(SessionPublishedNotifyService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly queue: TelegramNotifyQueue,
		private readonly config: ConfigService,
	) {}

	/**
	 * Called after Session transitions into PUBLISHED.
	 * Creates Notification rows + enqueues telegram-notify jobs (idempotent).
	 */
	async onSessionPublished(sessionId: string): Promise<{ followers: number; enqueued: number }> {
		const session = await this.prisma.session.findUnique({
			where: { id: sessionId },
			include: {
				movie: { select: { id: true, title: true } },
				cinema: { select: { id: true, name: true } },
			},
		});
		if (!session || session.status !== "PUBLISHED") {
			return { followers: 0, enqueued: 0 };
		}

		const follows = await this.prisma.cinemaFollow.findMany({
			where: { cinemaId: session.cinemaId },
			select: {
				userId: true,
				user: { select: { id: true, telegramId: true } },
			},
		});

		let enqueued = 0;
		for (let i = 0; i < follows.length; i += CHUNK) {
			const chunk = follows.slice(i, i + CHUNK);
			for (const follow of chunk) {
				const created = await this.notifyFollower(session, follow.user);
				if (created) enqueued += 1;
			}
		}

		this.log.log(
			`session.published ${sessionId}: followers=${follows.length} enqueued=${enqueued}`,
		);
		return { followers: follows.length, enqueued };
	}

	private async notifyFollower(
		session: {
			id: string;
			cinemaId: string;
			startsAt: Date;
			movie: { id: string; title: string };
			cinema: { id: string; name: string };
			updatedAt: Date;
		},
		user: { id: string; telegramId: string | null },
	): Promise<boolean> {
		const idempotencyKey = `notify:session.published:${session.id}:${user.id}`;
		const existing = await this.prisma.notification.findFirst({
			where: {
				userId: user.id,
				type: TYPE,
				payload: { path: ["sessionId"], equals: session.id },
			},
		});
		if (existing && (existing.status === "SENT" || existing.status === "PENDING")) {
			return false;
		}

		const deepLink = this.buildDeepLink(`session_${session.id}`);
		const text = formatSessionPublishedRu(
			session.cinema.name,
			session.movie.title,
			session.startsAt,
		);
		const payload = {
			cinemaId: session.cinemaId,
			cinemaName: session.cinema.name,
			sessionId: session.id,
			movieId: session.movie.id,
			movieTitle: session.movie.title,
			startsAt: session.startsAt.toISOString(),
			deepLink,
			locale: "ru",
			idempotencyKey,
		};

		const notification = existing
			? await this.prisma.notification.update({
					where: { id: existing.id },
					data: { status: "PENDING", payload, sentAt: null },
				})
			: await this.prisma.notification.create({
					data: {
						userId: user.id,
						channel: "TELEGRAM",
						type: TYPE,
						status: "PENDING",
						payload,
					},
				});

		if (!user.telegramId) {
			await this.prisma.notification.update({
				where: { id: notification.id },
				data: {
					status: "FAILED",
					payload: { ...payload, failReason: "NO_TELEGRAM" },
				},
			});
			return false;
		}

		const job: TelegramNotifyJobPayload = {
			jobId: idempotencyKey,
			notificationId: notification.id,
			userId: user.id,
			telegramId: user.telegramId,
			locale: "ru",
			template: "cinema_session_published",
			text,
			replyMarkup: {
				inline_keyboard: [[{ text: "Открыть сеанс", url: deepLink }]],
			},
			idempotencyKey,
		};

		await this.queue.enqueue("notify.cinema.session_published", job);
		return true;
	}

	private buildDeepLink(startParam: string): string {
		const miniUrl = this.config.get<string>("TELEGRAM_MINI_APP_URL");
		if (miniUrl) {
			const sep = miniUrl.includes("?") ? "&" : "?";
			return `${miniUrl}${sep}startapp=${encodeURIComponent(startParam)}`;
		}
		const username = this.config.get<string>("TELEGRAM_BOT_USERNAME") ?? "bot";
		const short = this.config.get<string>("TELEGRAM_MINI_APP_SHORT_NAME") ?? "app";
		return `https://t.me/${username}/${short}?startapp=${encodeURIComponent(startParam)}`;
	}
}

export function formatSessionPublishedRu(
	cinemaName: string,
	movieTitle: string,
	startsAt: Date,
): string {
	const local = startsAt.toLocaleString("ru-RU", {
		timeZone: "Asia/Tashkent",
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
	return `В «${cinemaName}» новый сеанс: ${movieTitle} — ${local}`;
}
