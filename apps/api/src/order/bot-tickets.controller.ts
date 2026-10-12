import { BadRequestException, Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { InternalSecretGuard } from "../payment/internal-secret.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("internal/telegram-users")
@UseGuards(InternalSecretGuard)
export class BotTicketsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get(":telegramId/tickets")
	async list(
		@Param("telegramId") telegramId: string,
		@Query("page") pageRaw = "0",
		@Query("scope") scope = "active",
	) {
		const page = Number(pageRaw);
		if (
			!/^\d{1,20}$/.test(telegramId) ||
			!Number.isSafeInteger(page) ||
			page < 0 ||
			page > 10_000 ||
			!["active", "history"].includes(scope)
		)
			throw new BadRequestException();
		const now = new Date();
		const where = {
			order: { user: { telegramId } },
			...(scope === "active"
				? { status: "ACTIVE" as const, session: { startsAt: { gte: now } } }
				: { OR: [{ status: { not: "ACTIVE" as const } }, { session: { startsAt: { lt: now } } }] }),
		};
		const [rows, total] = await Promise.all([
			this.prisma.ticket.findMany({
				where,
				orderBy: [{ session: { startsAt: "asc" } }, { id: "asc" }],
				skip: page * 5,
				take: 5,
				include: {
					session: {
						include: { movie: { select: { title: true } }, hall: { select: { name: true } } },
					},
					order: { select: { cinema: { select: { name: true } } } },
				},
			}),
			this.prisma.ticket.count({ where }),
		]);
		const seats = await this.prisma.seat.findMany({
			where: { id: { in: rows.flatMap((ticket) => (ticket.seatId ? [ticket.seatId] : [])) } },
			select: { id: true, rowLabel: true, number: true },
		});
		return {
			page,
			scope,
			total,
			hasNext: (page + 1) * 5 < total,
			tickets: rows.map((ticket) => {
				const seat = seats.find((row) => row.id === ticket.seatId);
				return {
					id: ticket.id,
					movieTitle: ticket.session.movie.title,
					cinemaName: ticket.order.cinema.name,
					startsAt: ticket.session.startsAt,
					hallName: ticket.session.hall.name,
					seatLabel: seat ? `${seat.rowLabel}${seat.number}` : "Входной билет",
					status: ticket.status,
				};
			}),
		};
	}

	@Get(":telegramId/tickets/:id/qr")
	async qr(@Param("telegramId") telegramId: string, @Param("id") id: string) {
		if (!/^\d{1,20}$/.test(telegramId)) throw new BadRequestException();
		const ticket = await this.prisma.ticket.findFirst({
			where: {
				id,
				order: { user: { telegramId } },
				status: "ACTIVE",
				session: { startsAt: { gte: new Date() } },
			},
			select: { code: true },
		});
		return ticket ? { code: ticket.code } : null;
	}
}
