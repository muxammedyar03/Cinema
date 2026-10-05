import type { SessionUser } from "@cinema/types";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrderService {
	constructor(private readonly prisma: PrismaService) {}

	async detail(user: SessionUser, id: string) {
		const order = await this.prisma.order.findUnique({
			where: { id },
			include: {
				cinema: { select: { name: true } },
				session: {
					include: { movie: { select: { title: true } }, hall: { select: { name: true } } },
				},
				items: true,
				tickets: true,
				refunds: true,
			},
		});
		if (!order) throw new NotFoundException();
		if (
			user.role === "SUPER_ADMIN" ||
			!user.staff.some((staff) => staff.cinemaId === order.cinemaId)
		)
			throw new ForbiddenException();
		const seats = await this.prisma.seat.findMany({
			where: { id: { in: order.tickets.flatMap((t) => (t.seatId ? [t.seatId] : [])) } },
		});
		return {
			...order,
			tickets: order.tickets.map((t) => {
				const seat = seats.find((s) => s.id === t.seatId);
				const item = order.items.find(
					(i) => i.type === t.type && (t.type !== "SEAT" || i.seatId === t.seatId),
				);
				return {
					...t,
					seatLabel: seat ? `${seat.rowLabel}${seat.number}` : null,
					unitPriceUzs: item?.unitPriceUzs,
				};
			}),
		};
	}

	async listAdmin(user: SessionUser) {
		if (user.role === "SUPER_ADMIN") {
			throw new ForbiddenException("Super Admin cannot access client order details (privacy)");
		}
		const cinemaIds = user.staff.map((s) => s.cinemaId);
		if (cinemaIds.length === 0) {
			throw new ForbiddenException("No cinema access");
		}

		const orders = await this.prisma.order.findMany({
			where: { cinemaId: { in: cinemaIds } },
			orderBy: { createdAt: "desc" },
			take: 100,
			include: {
				cinema: { select: { name: true } },
				session: { include: { movie: { select: { title: true } } } },
				user: { select: { email: true, firstName: true, lastName: true } },
				_count: { select: { tickets: true } },
			},
		});

		return orders.map((o) => ({
			id: o.id,
			publicNumber: o.publicNumber,
			status: o.status,
			totalUzs: o.totalUzs,
			createdAt: o.createdAt,
			cinemaName: o.cinema.name,
			movieTitle: o.session.movie.title,
			ticketCount: o._count.tickets,
			customer:
				[o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.user.email || "—",
		}));
	}
}
