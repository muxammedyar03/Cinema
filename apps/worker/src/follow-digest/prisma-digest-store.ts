import type { Prisma, PrismaClient } from "@prisma/client";
import {
	DIGEST_NOTIFICATION_TYPE,
	type DigestNotificationPayload,
	type DigestStore,
} from "./run-cinema-digest.js";

function pendingWhere(cinemaId: string, now: Date): Prisma.SessionWhereInput {
	return { cinemaId, status: "PUBLISHED", notifiedAt: null, startsAt: { gte: now } };
}

function toJson(payload: DigestNotificationPayload): Prisma.InputJsonObject {
	return payload as unknown as Prisma.InputJsonObject;
}

export function createPrismaDigestStore(prisma: PrismaClient): DigestStore {
	return {
		async findSessionsStampedAt(cinemaId, stamp) {
			const rows = await prisma.session.findMany({
				where: { cinemaId, notifiedAt: stamp },
				select: {
					id: true,
					status: true,
					startsAt: true,
					movieId: true,
					movie: { select: { title: true } },
				},
				orderBy: { startsAt: "asc" },
			});
			return rows.map((r) => ({
				id: r.id,
				status: r.status,
				startsAt: r.startsAt,
				movieId: r.movieId,
				movieTitle: r.movie.title,
			}));
		},

		async claimPendingSessions(cinemaId, stamp, now) {
			const res = await prisma.session.updateMany({
				where: pendingWhere(cinemaId, now),
				data: { notifiedAt: stamp },
			});
			return res.count;
		},

		async countPendingSessions(cinemaId, now) {
			return prisma.session.count({ where: pendingWhere(cinemaId, now) });
		},

		async getCinemaName(cinemaId) {
			const cinema = await prisma.cinema.findUnique({
				where: { id: cinemaId },
				select: { name: true },
			});
			return cinema?.name ?? null;
		},

		async listFollowers(cinemaId) {
			const follows = await prisma.cinemaFollow.findMany({
				where: { cinemaId },
				select: { userId: true, user: { select: { telegramId: true } } },
				orderBy: { createdAt: "asc" },
			});
			return follows.map((f) => ({ userId: f.userId, telegramId: f.user.telegramId }));
		},

		async findDigestNotifications(windowKey) {
			return prisma.notification.findMany({
				where: {
					type: DIGEST_NOTIFICATION_TYPE,
					payload: { path: ["windowKey"], equals: windowKey },
				},
				select: { id: true, userId: true, status: true },
			});
		},

		async createDigestNotification(userId, payload) {
			return prisma.notification.create({
				data: {
					userId,
					channel: "TELEGRAM",
					type: DIGEST_NOTIFICATION_TYPE,
					status: "PENDING",
					payload: toJson(payload),
				},
				select: { id: true, userId: true, status: true },
			});
		},

		async markNotificationFailed(id, payload, failReason) {
			await prisma.notification.update({
				where: { id },
				data: { status: "FAILED", payload: { ...toJson(payload), failReason } },
			});
		},
	};
}
