import type { SessionUser } from "@cinema/types";
import type { CreateSessionInput, UpdateSessionInput } from "@cinema/validation";
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { gaQtyBySessionIds } from "../booking/capacity";
import { SessionPublishedNotifyService } from "../notify/session-published.notify";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { type SeatStatusCount, sessionSeatCounts } from "./session-counts";

const CATALOG_PREFIX = "catalog:";
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

function tashkentStartOfToday() {
	const shifted = new Date(Date.now() + TASHKENT_OFFSET_MS);
	return new Date(
		Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
			TASHKENT_OFFSET_MS,
	);
}

@Injectable()
export class SessionService {
	private readonly log = new Logger(SessionService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly sessionPublishedNotify: SessionPublishedNotifyService,
	) {}

	async list(user: SessionUser, cinemaId?: string) {
		if (cinemaId && !canAccessCinema(user, cinemaId)) {
			throw new ForbiddenException("Cinema out of scope");
		}
		const cinemaIds = user.role === "SUPER_ADMIN" ? undefined : user.staff.map((s) => s.cinemaId);
		const scope = cinemaId ? { cinemaId } : cinemaIds ? { cinemaId: { in: cinemaIds } } : {};
		await this.prisma.session.updateMany({
			where: {
				...scope,
				startsAt: { lt: tashkentStartOfToday() },
				status: { in: ["DRAFT", "PUBLISHED"] },
			},
			data: { status: "CANCELLED", cancelledAt: new Date() },
		});
		const rows = await this.prisma.session.findMany({
			where: scope,
			orderBy: { startsAt: "asc" },
			include: {
				movie: true,
				cinema: { select: { id: true, name: true } },
				hall: { select: { id: true, name: true, capacity: true, format: true } },
				_count: { select: { sessionSeats: true } },
			},
		});
		const withCounts = await this.withSeatCounts(rows);
		if (withCounts.length === 0) return withCounts.map((row) => ({ ...row, soldSeats: 0 }));
		const sold = await this.prisma.sessionSeat.groupBy({
			by: ["sessionId"],
			where: { status: "SOLD", sessionId: { in: withCounts.map((row) => row.id) } },
			_count: { _all: true },
		});
		const soldById = new Map(sold.map((row) => [row.sessionId, row._count._all]));
		return withCounts.map((row) => ({ ...row, soldSeats: soldById.get(row.id) ?? 0 }));
	}

	async get(user: SessionUser, id: string) {
		const session = await this.prisma.session.findUnique({
			where: { id },
			include: {
				movie: true,
				cinema: true,
				hall: true,
				pricing: true,
				_count: { select: { sessionSeats: true } },
			},
		});
		if (!session) throw new NotFoundException("Session not found");
		if (!canAccessCinema(user, session.cinemaId)) {
			throw new ForbiddenException("Cinema out of scope");
		}
		return session;
	}

	async create(user: SessionUser, data: CreateSessionInput) {
		if (!canManageCinema(user, data.cinemaId)) {
			throw new ForbiddenException("Only cinema admin can create sessions");
		}
		const hall = await this.prisma.hall.findFirst({
			where: { id: data.hallId, cinemaId: data.cinemaId },
		});
		if (!hall) throw new BadRequestException("Hall does not belong to cinema");
		const movie = await this.prisma.movie.findUnique({ where: { id: data.movieId } });
		if (!movie) throw new BadRequestException("Movie not found");
		if (movie.cinemaId !== data.cinemaId) {
			throw new BadRequestException("Movie does not belong to this cinema");
		}
		if (movie.status === "ARCHIVED") {
			throw new BadRequestException("Movie is archived");
		}

		const layout = await this.prisma.hallLayout.findFirst({
			where: { hallId: hall.id, isActive: true },
			include: { seats: true },
		});
		const isGa = Boolean(data.generalAdmission);
		if (!isGa && (!layout || layout.seats.length === 0)) {
			throw new BadRequestException("Hall has no active layout seats");
		}

		const vipPrice = data.vipPriceUzs ?? data.basePriceUzs;
		const session = await this.prisma.$transaction(async (tx) => {
			const created = await tx.session.create({
				data: {
					movieId: data.movieId,
					cinemaId: data.cinemaId,
					hallId: data.hallId,
					startsAt: data.startsAt,
					basePriceUzs: data.basePriceUzs,
					discountPercent: data.discountPercent,
					audioLanguage: data.audioLanguage ?? null,
					pricing: {
						create: [
							{ seatType: "STANDARD", priceUzs: data.basePriceUzs },
							{ seatType: "VIP", priceUzs: vipPrice },
							{ seatType: "BLOCKED", priceUzs: 0 },
						],
					},
				},
			});
			if (!isGa && layout) {
				await tx.sessionSeat.createMany({
					data: layout.seats.map((seat) => ({
						sessionId: created.id,
						seatId: seat.id,
						status: seat.type === "BLOCKED" ? "BLOCKED" : "AVAILABLE",
						priceUzs: seat.type === "VIP" ? vipPrice : data.basePriceUzs,
					})),
				});
			}
			return created;
		});
		await this.invalidateCatalog();
		return this.get(user, session.id);
	}

	async update(user: SessionUser, id: string, data: UpdateSessionInput) {
		const session = await this.get(user, id);
		if (!canManageCinema(user, session.cinemaId)) {
			throw new ForbiddenException("Only cinema admin can update sessions");
		}
		if (data.startsAt && data.startsAt < tashkentStartOfToday()) {
			throw new BadRequestException("Дата сеанса не может быть в прошлом");
		}
		const hallId = data.hallId ?? session.hallId;
		const hallChanged = hallId !== session.hallId;
		const currentlyGa = session._count.sessionSeats === 0;
		const nextGa = data.generalAdmission ?? currentlyGa;
		const mapChanged = hallChanged || nextGa !== currentlyGa;
		if (hallChanged) {
			const hall = await this.prisma.hall.findFirst({
				where: { id: hallId, cinemaId: session.cinemaId },
			});
			if (!hall) throw new BadRequestException("Hall does not belong to cinema");
		}
		const locked = await this.prisma.sessionSeat.count({
			where: { sessionId: id, status: { in: ["SOLD", "HELD"] } },
		});
		if (locked > 0 && mapChanged) {
			throw new BadRequestException("Нельзя сменить зал: есть проданные или удерживаемые места");
		}
		const std = data.basePriceUzs ?? session.basePriceUzs;
		const vip = data.vipPriceUzs ?? data.basePriceUzs ?? session.basePriceUzs;
		const layout =
			mapChanged && !nextGa
				? await this.prisma.hallLayout.findFirst({
						where: { hallId, isActive: true },
						include: { seats: true },
					})
				: null;
		if (mapChanged && !nextGa && (!layout || layout.seats.length === 0)) {
			throw new BadRequestException("Hall has no active layout seats");
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.session.update({
				where: { id },
				data: {
					startsAt: data.startsAt,
					hallId: hallChanged ? hallId : undefined,
					basePriceUzs: data.basePriceUzs,
					discountPercent: data.discountPercent,
					...(data.audioLanguage !== undefined ? { audioLanguage: data.audioLanguage } : {}),
				},
			});
			if (data.basePriceUzs || data.vipPriceUzs) {
				await tx.sessionPricing.upsert({
					where: { sessionId_seatType: { sessionId: id, seatType: "STANDARD" } },
					update: { priceUzs: std },
					create: { sessionId: id, seatType: "STANDARD", priceUzs: std },
				});
				await tx.sessionPricing.upsert({
					where: { sessionId_seatType: { sessionId: id, seatType: "VIP" } },
					update: { priceUzs: vip },
					create: { sessionId: id, seatType: "VIP", priceUzs: vip },
				});
			}
			if (mapChanged) {
				await tx.sessionSeat.deleteMany({ where: { sessionId: id } });
				if (layout) {
					await tx.sessionSeat.createMany({
						data: layout.seats.map((seat) => ({
							sessionId: id,
							seatId: seat.id,
							status: seat.type === "BLOCKED" ? "BLOCKED" : "AVAILABLE",
							priceUzs: seat.type === "VIP" ? vip : seat.type === "BLOCKED" ? 0 : std,
						})),
					});
				}
			} else if (data.basePriceUzs || data.vipPriceUzs) {
				const seats = await tx.sessionSeat.findMany({
					where: { sessionId: id, status: { not: "SOLD" } },
					include: { seat: { select: { type: true } } },
				});
				const standardIds = seats
					.filter((row) => row.seat.type === "STANDARD")
					.map((row) => row.id);
				const vipIds = seats.filter((row) => row.seat.type === "VIP").map((row) => row.id);
				if (standardIds.length > 0) {
					await tx.sessionSeat.updateMany({
						where: { id: { in: standardIds } },
						data: { priceUzs: std },
					});
				}
				if (vipIds.length > 0) {
					await tx.sessionSeat.updateMany({
						where: { id: { in: vipIds } },
						data: { priceUzs: vip },
					});
				}
			}
		});
		await this.invalidateCatalog();
		return this.get(user, id);
	}

	async publish(user: SessionUser, id: string) {
		const session = await this.get(user, id);
		if (!canManageCinema(user, session.cinemaId)) {
			throw new ForbiddenException("Only cinema admin can publish sessions");
		}
		if (session.status === "PUBLISHED") {
			return session;
		}
		if (session.status !== "DRAFT" && session.status !== "CANCELLED") {
			throw new BadRequestException("Only DRAFT or CANCELLED sessions can be published");
		}
		// GA sessions have zero seats; seated sessions need a map
		await this.prisma.session.update({ where: { id }, data: { status: "PUBLISHED" } });
		await this.invalidateCatalog();
		// Fire-and-forget digest scheduling (API must not call Telegram directly).
		// The session is already PUBLISHED in the DB, so a queue/Redis failure must not fail the
		// admin request; it is logged instead. Recovery: the session keeps notifiedAt = NULL and is
		// picked up by the next digest of this cinema (see follow-notify.md § KAN-35).
		void this.sessionPublishedNotify.onSessionPublished(id).catch((err: unknown) => {
			const error = err instanceof Error ? err : new Error(String(err));
			this.log.error(
				`Follow digest scheduling failed for session ${id} (cinema ${session.cinemaId}): ${error.message}`,
				error.stack,
			);
		});
		return this.get(user, id);
	}

	async cancel(user: SessionUser, id: string) {
		const session = await this.get(user, id);
		if (!canManageCinema(user, session.cinemaId)) {
			throw new ForbiddenException("Only cinema admin can cancel sessions");
		}
		if (session.status !== "PUBLISHED") {
			throw new BadRequestException("Only PUBLISHED sessions can be cancelled");
		}
		await this.prisma.session.update({
			where: { id },
			data: { status: "CANCELLED", cancelledAt: new Date() },
		});
		await this.invalidateCatalog();
		return this.get(user, id);
	}

	private async withSeatCounts<T extends { id: string; hall: { capacity: number } }>(rows: T[]) {
		const counts = await this.countsBySession(rows.map((row) => row.id));
		return rows.map((row) => {
			const count = counts.get(row.id);
			const seats = sessionSeatCounts({
				capacity: row.hall.capacity,
				byStatus: count?.byStatus ?? {},
				gaSold: count?.gaSold ?? 0,
				gaOccupied: count?.gaOccupied ?? 0,
			});
			return { ...row, sold: seats.sold, remaining: seats.remaining };
		});
	}

	private async countsBySession(ids: string[]) {
		const map = new Map<
			string,
			{ byStatus: SeatStatusCount; gaSold: number; gaOccupied: number }
		>();
		if (ids.length === 0) return map;
		const [groups, gaSoldRows, gaOccupied] = await Promise.all([
			this.prisma.sessionSeat.groupBy({
				by: ["sessionId", "status"],
				where: { sessionId: { in: ids } },
				_count: { _all: true },
			}),
			this.prisma.orderItem.findMany({
				where: {
					type: "GENERAL_ADMISSION",
					order: { sessionId: { in: ids }, status: "PAID" },
				},
				select: { quantity: true, order: { select: { sessionId: true } } },
			}),
			gaQtyBySessionIds(this.prisma, ids),
		]);
		for (const row of groups) {
			const current = map.get(row.sessionId) ?? { byStatus: {}, gaSold: 0, gaOccupied: 0 };
			current.byStatus[row.status] = row._count._all;
			map.set(row.sessionId, current);
		}
		for (const row of gaSoldRows) {
			const id = row.order.sessionId;
			const current = map.get(id) ?? { byStatus: {}, gaSold: 0, gaOccupied: 0 };
			current.gaSold += row.quantity;
			map.set(id, current);
		}
		for (const [id, qty] of gaOccupied) {
			const current = map.get(id) ?? { byStatus: {}, gaSold: 0, gaOccupied: 0 };
			current.gaOccupied = qty;
			map.set(id, current);
		}
		return map;
	}

	async invalidateCatalog() {
		const keys = await this.redis.client.keys(`${CATALOG_PREFIX}*`);
		if (keys.length > 0) await this.redis.client.del(...keys);
	}
}
