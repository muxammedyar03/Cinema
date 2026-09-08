import type { SessionUser } from "@cinema/types";
import type { CreateSessionInput, UpdateSessionInput } from "@cinema/validation";
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

const CATALOG_PREFIX = "catalog:";

@Injectable()
export class SessionService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
	) {}

	async list(user: SessionUser, cinemaId?: string) {
		if (cinemaId && !canAccessCinema(user, cinemaId)) {
			throw new ForbiddenException("Cinema out of scope");
		}
		const cinemaIds = user.role === "SUPER_ADMIN" ? undefined : user.staff.map((s) => s.cinemaId);
		return this.prisma.session.findMany({
			where: {
				...(cinemaId ? { cinemaId } : cinemaIds ? { cinemaId: { in: cinemaIds } } : {}),
			},
			orderBy: { startsAt: "asc" },
			include: {
				movie: true,
				cinema: { select: { id: true, name: true } },
				hall: { select: { id: true, name: true, capacity: true } },
				_count: { select: { sessionSeats: true } },
			},
		});
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
		if (session.status !== "DRAFT") {
			throw new BadRequestException("Only DRAFT sessions can be edited");
		}
		await this.prisma.session.update({
			where: { id },
			data: {
				startsAt: data.startsAt,
				basePriceUzs: data.basePriceUzs,
				discountPercent: data.discountPercent,
			},
		});
		if (data.basePriceUzs || data.vipPriceUzs) {
			const vip = data.vipPriceUzs ?? data.basePriceUzs ?? session.basePriceUzs;
			const std = data.basePriceUzs ?? session.basePriceUzs;
			await this.prisma.sessionPricing.upsert({
				where: { sessionId_seatType: { sessionId: id, seatType: "STANDARD" } },
				update: { priceUzs: std },
				create: { sessionId: id, seatType: "STANDARD", priceUzs: std },
			});
			await this.prisma.sessionPricing.upsert({
				where: { sessionId_seatType: { sessionId: id, seatType: "VIP" } },
				update: { priceUzs: vip },
				create: { sessionId: id, seatType: "VIP", priceUzs: vip },
			});
		}
		await this.invalidateCatalog();
		return this.get(user, id);
	}

	async publish(user: SessionUser, id: string) {
		const session = await this.get(user, id);
		if (!canManageCinema(user, session.cinemaId)) {
			throw new ForbiddenException("Only cinema admin can publish sessions");
		}
		if (session.status !== "DRAFT") {
			throw new BadRequestException("Only DRAFT sessions can be published");
		}
		// GA sessions have zero seats; seated sessions need a map
		await this.prisma.session.update({ where: { id }, data: { status: "PUBLISHED" } });
		await this.invalidateCatalog();
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

	async invalidateCatalog() {
		const keys = await this.redis.client.keys(`${CATALOG_PREFIX}*`);
		if (keys.length > 0) await this.redis.client.del(...keys);
	}
}
