import type { SessionUser } from "@cinema/types";
import type { HoldGaInput, HoldSeatsInput } from "@cinema/validation";
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { countSessionOccupied } from "./capacity";

const HOLD_TTL_SEC = 600;

@Injectable()
export class BookingService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
	) {}

	async holdSeats(user: SessionUser, input: HoldSeatsInput) {
		const seatIds = [...new Set(input.seatIds)].sort();
		const session = await this.prisma.session.findUnique({
			where: { id: input.sessionId },
			include: {
				hall: { select: { capacity: true } },
				cinema: { select: { id: true, status: true } },
			},
		});
		if (!session || session.status !== "PUBLISHED") {
			throw new NotFoundException("Session not available");
		}
		if (session.cinema.status !== "ACTIVE") {
			throw new UnprocessableEntityException("Cinema disabled");
		}

		const expiresAt = new Date(Date.now() + HOLD_TTL_SEC * 1000);

		const order = await this.prisma.$transaction(async (tx) => {
			await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${session.id} FOR UPDATE`;

			const seats = await tx.sessionSeat.findMany({
				where: { sessionId: session.id, seatId: { in: seatIds } },
				include: { seat: true },
				orderBy: { id: "asc" },
			});
			if (seats.length !== seatIds.length) {
				throw new UnprocessableEntityException("Some seats not found on this session");
			}
			for (const seat of seats) {
				if (seat.status !== "AVAILABLE" || seat.seat.type === "BLOCKED") {
					throw new ConflictException(`Seat ${seat.seat.rowLabel}${seat.seat.number} unavailable`);
				}
			}

			const occupied = await countSessionOccupied(tx, session.id);
			const remaining = session.hall.capacity - occupied;
			if (remaining < seats.length) {
				throw new ConflictException("Not enough remaining capacity");
			}

			const totalUzs = seats.reduce((sum, s) => sum + s.priceUzs, 0);
			const created = await tx.order.create({
				data: {
					userId: user.id,
					cinemaId: session.cinemaId,
					sessionId: session.id,
					status: "PENDING_PAYMENT",
					totalUzs,
					holdExpiresAt: expiresAt,
					items: {
						create: seats.map((s) => ({
							type: "SEAT" as const,
							quantity: 1,
							unitPriceUzs: s.priceUzs,
							seatId: s.seatId,
						})),
					},
				},
				include: { items: true },
			});

			for (const seat of seats) {
				const item = created.items.find((i) => i.seatId === seat.seatId);
				const updated = await tx.sessionSeat.updateMany({
					where: { id: seat.id, status: "AVAILABLE" },
					data: {
						status: "HELD",
						holdExpiresAt: expiresAt,
						orderItemId: item?.id,
					},
				});
				if (updated.count !== 1) {
					throw new ConflictException("Seat race lost");
				}
			}

			return { created, seats };
		});

		for (const seatId of seatIds) {
			await this.redis.client.set(
				`hold:session:${session.id}:seat:${seatId}`,
				JSON.stringify({ orderId: order.created.id, userId: user.id }),
				"EX",
				HOLD_TTL_SEC,
				"NX",
			);
		}

		return {
			orderId: order.created.id,
			publicNumber: order.created.publicNumber,
			status: order.created.status,
			totalUzs: order.created.totalUzs,
			holdExpiresAt: expiresAt,
			seatIds,
			seats: order.seats.map((s) => ({
				seatId: s.seatId,
				label: `${s.seat.rowLabel}${s.seat.number}`,
				type: s.seat.type,
				priceUzs: s.priceUzs,
			})),
			ttlSec: HOLD_TTL_SEC,
		};
	}

	async holdGa(user: SessionUser, input: HoldGaInput) {
		const qty = input.quantity;
		const session = await this.prisma.session.findUnique({
			where: { id: input.sessionId },
			include: {
				hall: { select: { capacity: true } },
				cinema: { select: { id: true, status: true } },
				_count: { select: { sessionSeats: true } },
			},
		});
		if (!session || session.status !== "PUBLISHED") {
			throw new NotFoundException("Session not available");
		}
		if (session.cinema.status !== "ACTIVE") {
			throw new UnprocessableEntityException("Cinema disabled");
		}
		if (session._count.sessionSeats > 0) {
			throw new UnprocessableEntityException("This session uses assigned seats");
		}

		const expiresAt = new Date(Date.now() + HOLD_TTL_SEC * 1000);

		const created = await this.prisma.$transaction(async (tx) => {
			await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${session.id} FOR UPDATE`;

			const occupied = await countSessionOccupied(tx, session.id);
			const remaining = session.hall.capacity - occupied;
			if (remaining < qty) {
				throw new ConflictException("Not enough remaining capacity");
			}

			const totalUzs = session.basePriceUzs * qty;
			return tx.order.create({
				data: {
					userId: user.id,
					cinemaId: session.cinemaId,
					sessionId: session.id,
					status: "PENDING_PAYMENT",
					totalUzs,
					holdExpiresAt: expiresAt,
					items: {
						create: [
							{
								type: "GENERAL_ADMISSION",
								quantity: qty,
								unitPriceUzs: session.basePriceUzs,
								seatId: null,
							},
						],
					},
				},
			});
		});

		await this.redis.client.set(
			`hold:session:${session.id}:ga:${created.id}`,
			JSON.stringify({ orderId: created.id, userId: user.id, quantity: qty }),
			"EX",
			HOLD_TTL_SEC,
		);

		return {
			orderId: created.id,
			publicNumber: created.publicNumber,
			status: created.status,
			totalUzs: created.totalUzs,
			holdExpiresAt: expiresAt,
			quantity: qty,
			ttlSec: HOLD_TTL_SEC,
		};
	}

	async getOrder(user: SessionUser, orderId: string) {
		const order = await this.prisma.order.findUnique({
			where: { id: orderId },
			include: {
				cinema: { select: { id: true, name: true } },
				session: {
					include: {
						movie: { select: { id: true, title: true, posterUrl: true } },
						hall: { select: { id: true, name: true } },
					},
				},
				items: true,
				tickets: { select: { id: true, code: true, status: true } },
			},
		});
		if (!order) throw new NotFoundException("Order not found");
		if (order.userId !== user.id && user.role !== "SUPER_ADMIN") {
			throw new ForbiddenException();
		}

		const seatIds = order.items.map((i) => i.seatId).filter(Boolean) as string[];
		const seats =
			seatIds.length > 0
				? await this.prisma.seat.findMany({
						where: { id: { in: seatIds } },
						select: { id: true, rowLabel: true, number: true, type: true },
					})
				: [];
		const seatMap = new Map(seats.map((s) => [s.id, s]));

		return {
			id: order.id,
			publicNumber: order.publicNumber,
			status: order.status,
			totalUzs: order.totalUzs,
			holdExpiresAt: order.holdExpiresAt,
			createdAt: order.createdAt,
			cinema: order.cinema,
			session: {
				id: order.session.id,
				startsAt: order.session.startsAt,
				movie: order.session.movie,
				hall: order.session.hall,
			},
			items: order.items.map((item) => {
				const seat = item.seatId ? seatMap.get(item.seatId) : null;
				return {
					id: item.id,
					type: item.type,
					quantity: item.quantity,
					unitPriceUzs: item.unitPriceUzs,
					seatLabel: seat ? `${seat.rowLabel}${seat.number}` : null,
					seatType: seat?.type ?? null,
				};
			}),
			tickets: order.tickets,
		};
	}

	async listMyOrders(user: SessionUser) {
		const rows = await this.prisma.order.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			take: 30,
			include: {
				cinema: { select: { name: true } },
				session: {
					include: {
						movie: { select: { title: true } },
						hall: { select: { name: true } },
					},
				},
				items: true,
			},
		});
		return rows.map((o) => ({
			id: o.id,
			publicNumber: o.publicNumber,
			status: o.status,
			totalUzs: o.totalUzs,
			holdExpiresAt: o.holdExpiresAt,
			createdAt: o.createdAt,
			cinemaName: o.cinema.name,
			movieTitle: o.session.movie.title,
			hallName: o.session.hall.name,
			startsAt: o.session.startsAt,
			itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
		}));
	}

	async releaseExpiredHolds() {
		const now = new Date();
		let released = 0;

		const expiredSeats = await this.prisma.sessionSeat.findMany({
			where: { status: "HELD", holdExpiresAt: { lt: now } },
			select: { id: true, sessionId: true, seatId: true, orderItemId: true },
		});
		for (const seat of expiredSeats) {
			await this.prisma.$transaction(async (tx) => {
				await tx.sessionSeat.updateMany({
					where: { id: seat.id, status: "HELD" },
					data: { status: "AVAILABLE", holdExpiresAt: null, orderItemId: null },
				});
				if (seat.orderItemId) {
					const item = await tx.orderItem.findUnique({
						where: { id: seat.orderItemId },
						select: { orderId: true },
					});
					if (item) {
						const stillHeld = await tx.sessionSeat.count({
							where: {
								orderItem: { orderId: item.orderId },
								status: "HELD",
							},
						});
						if (stillHeld === 0) {
							await tx.order.updateMany({
								where: { id: item.orderId, status: "PENDING_PAYMENT" },
								data: { status: "EXPIRED" },
							});
						}
					}
				}
			});
			await this.redis.client.del(`hold:session:${seat.sessionId}:seat:${seat.seatId}`);
			released += 1;
		}

		const expiredGa = await this.prisma.order.findMany({
			where: {
				status: "PENDING_PAYMENT",
				holdExpiresAt: { lt: now },
				items: { some: { type: "GENERAL_ADMISSION" } },
				AND: [{ items: { none: { type: "SEAT" } } }],
			},
			select: { id: true, sessionId: true },
		});
		for (const order of expiredGa) {
			await this.prisma.order.updateMany({
				where: { id: order.id, status: "PENDING_PAYMENT" },
				data: { status: "EXPIRED" },
			});
			await this.redis.client.del(`hold:session:${order.sessionId}:ga:${order.id}`);
			released += 1;
		}

		return { released };
	}
}
