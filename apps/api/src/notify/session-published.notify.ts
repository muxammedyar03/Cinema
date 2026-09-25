import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { cinemaDigestKey } from "../queue/follow-digest.options";
import { FollowDigestQueue } from "../queue/follow-digest.queue";

@Injectable()
export class SessionPublishedNotifyService {
	private readonly log = new Logger(SessionPublishedNotifyService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly digestQueue: FollowDigestQueue,
		private readonly config: ConfigService,
	) {}

	/**
	 * Called after Session transitions into PUBLISHED.
	 * KAN-35: no immediate send — schedules the debounced per-cinema digest
	 * (`notify:cinema:{cinemaId}`). The worker builds one message per follower when the
	 * window closes, from all PUBLISHED sessions of the cinema with `notifiedAt IS NULL`.
	 */
	async onSessionPublished(sessionId: string): Promise<{ scheduled: boolean; key?: string }> {
		const session = await this.prisma.session.findUnique({
			where: { id: sessionId },
			select: { id: true, cinemaId: true, status: true, notifiedAt: true },
		});
		if (!session || session.status !== "PUBLISHED" || session.notifiedAt) {
			return { scheduled: false };
		}

		const key = cinemaDigestKey(session.cinemaId);
		await this.digestQueue.scheduleCinemaDigest(
			session.cinemaId,
			this.buildDeepLink(`cinema_${session.cinemaId}`),
		);
		this.log.log(`session.published ${sessionId}: digest ${key} scheduled`);
		return { scheduled: true, key };
	}

	/** Existing Mini App deep-link scheme (same as KAN-26 `session_…` / bot menu). */
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
