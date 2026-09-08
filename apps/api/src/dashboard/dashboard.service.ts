import type { SessionUser } from "@cinema/types";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const TZ = "Asia/Tashkent";

function dayKey(date: Date): string {
	return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

function startOfToday(): Date {
	return new Date(`${dayKey(new Date())}T00:00:00+05:00`);
}

function daysAgo(n: number): Date {
	const base = startOfToday();
	return new Date(base.getTime() - n * 24 * 60 * 60 * 1000);
}

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async overview(user: SessionUser) {
		const cinemaIds = user.role === "SUPER_ADMIN" ? null : user.staff.map((s) => s.cinemaId);
		const cinemaFilter: Prisma.SessionWhereInput =
			cinemaIds === null ? {} : { cinemaId: { in: cinemaIds } };
		const orderCinema: Prisma.OrderWhereInput =
			cinemaIds === null ? {} : { cinemaId: { in: cinemaIds } };
		const cinemaWhere: Prisma.CinemaWhereInput =
			cinemaIds === null ? {} : { id: { in: cinemaIds } };

		const today = startOfToday();
		const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
		const weekStart = daysAgo(6);

		const [
			sessionsToday,
			sessionsPublished,
			sessionsTotal,
			ticketsActive,
			ordersPending,
			ordersPaid,
			paymentsPaidAgg,
			paymentsTodayAgg,
			refundsPending,
			refundsSucceededAgg,
			cinemas,
			movies,
			halls,
			todaySessionsRaw,
			recentOrders,
			recentPayments,
			paidPaymentsWeek,
			refundsWeek,
		] = await Promise.all([
			this.prisma.session.count({
				where: {
					...cinemaFilter,
					startsAt: { gte: today, lt: tomorrow },
					status: { in: ["PUBLISHED", "DRAFT"] },
				},
			}),
			this.prisma.session.count({
				where: { ...cinemaFilter, status: "PUBLISHED" },
			}),
			this.prisma.session.count({ where: cinemaFilter }),
			this.prisma.ticket.count({
				where: {
					status: "ACTIVE",
					...(cinemaIds ? { session: { cinemaId: { in: cinemaIds } } } : {}),
				},
			}),
			this.prisma.order.count({
				where: { ...orderCinema, status: "PENDING_PAYMENT" },
			}),
			this.prisma.order.count({
				where: { ...orderCinema, status: "PAID" },
			}),
			this.prisma.payment.aggregate({
				where: {
					status: "PAID",
					...(cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {}),
				},
				_sum: { amountUzs: true },
				_count: true,
			}),
			this.prisma.payment.aggregate({
				where: {
					status: "PAID",
					createdAt: { gte: today },
					...(cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {}),
				},
				_sum: { amountUzs: true },
			}),
			this.prisma.refund.count({
				where: {
					status: "PENDING",
					...(cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {}),
				},
			}),
			this.prisma.refund.aggregate({
				where: {
					status: "SUCCEEDED",
					...(cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {}),
				},
				_sum: { amountUzs: true },
			}),
			this.prisma.cinema.count({ where: cinemaWhere }),
			this.prisma.movie.count({
				where: cinemaIds ? { cinemaId: { in: cinemaIds } } : {},
			}),
			this.prisma.hall.count({
				where: cinemaIds ? { cinemaId: { in: cinemaIds } } : {},
			}),
			this.prisma.session.findMany({
				where: {
					...cinemaFilter,
					startsAt: { gte: today },
					status: { in: ["PUBLISHED", "DRAFT"] },
				},
				orderBy: { startsAt: "asc" },
				take: 8,
				include: {
					movie: { select: { title: true } },
					hall: { select: { name: true, capacity: true } },
					cinema: { select: { name: true } },
					sessionSeats: { select: { status: true } },
				},
			}),
			this.prisma.order.findMany({
				where: orderCinema,
				orderBy: { createdAt: "desc" },
				take: 4,
				include: {
					cinema: { select: { name: true } },
					session: { include: { movie: { select: { title: true } } } },
					user: { select: { email: true, firstName: true, lastName: true } },
				},
			}),
			this.prisma.payment.findMany({
				where: cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {},
				orderBy: { createdAt: "desc" },
				take: 8,
				include: {
					order: {
						select: {
							publicNumber: true,
							cinema: { select: { name: true } },
						},
					},
				},
			}),
			this.prisma.payment.findMany({
				where: {
					status: "PAID",
					createdAt: { gte: weekStart },
					...(cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {}),
				},
				select: { amountUzs: true, createdAt: true },
			}),
			this.prisma.refund.findMany({
				where: {
					status: "SUCCEEDED",
					createdAt: { gte: weekStart },
					...(cinemaIds ? { order: { cinemaId: { in: cinemaIds } } } : {}),
				},
				select: { amountUzs: true, createdAt: true },
			}),
		]);

		const todaySessions = todaySessionsRaw.map((s) => {
			const sold = s.sessionSeats.filter((x) =>
				["SOLD", "HELD", "BLOCKED"].includes(x.status),
			).length;
			return {
				id: s.id,
				startsAt: s.startsAt,
				status: s.status,
				movieTitle: s.movie.title,
				hallName: s.hall.name,
				cinemaName: s.cinema.name,
				capacity: s.hall.capacity,
				occupied: sold,
				remaining: Math.max(0, s.hall.capacity - sold),
			};
		});

		const trendMap = new Map<string, { incomeUzs: number; expenseUzs: number }>();
		for (let i = 6; i >= 0; i--) {
			trendMap.set(dayKey(daysAgo(i)), { incomeUzs: 0, expenseUzs: 0 });
		}
		for (const p of paidPaymentsWeek) {
			const key = dayKey(p.createdAt);
			const row = trendMap.get(key);
			if (row) row.incomeUzs += p.amountUzs;
		}
		for (const r of refundsWeek) {
			const key = dayKey(r.createdAt);
			const row = trendMap.get(key);
			if (row) row.expenseUzs += r.amountUzs;
		}

		const incomeUzs = paymentsPaidAgg._sum.amountUzs ?? 0;
		const expenseUzs = refundsSucceededAgg._sum.amountUzs ?? 0;
		const isSuper = user.role === "SUPER_ADMIN";

		// Super Admin: platform aggregates only — no client P&L, orders, tickets detail, payments
		if (isSuper) {
			return {
				mode: "platform" as const,
				stats: {
					sessionsToday,
					sessionsPublished,
					sessionsTotal,
					ticketsActive: 0,
					ordersPending,
					ordersPaid,
					paymentsCount: 0,
					revenueTodayUzs: 0,
					revenueTotalUzs: 0,
					refundsPending: 0,
					cinemas,
					movies: 0,
					halls: 0,
				},
				cashflow: { incomeUzs: 0, expenseUzs: 0, netUzs: 0 },
				todaySessions: [],
				recentOrders: [],
				recentPayments: [],
				revenueTrend: [...trendMap.entries()].map(([date]) => ({
					date,
					incomeUzs: 0,
					expenseUzs: 0,
					netUzs: 0,
				})),
			};
		}

		return {
			mode: "cinema" as const,
			stats: {
				sessionsToday,
				sessionsPublished,
				sessionsTotal,
				ticketsActive,
				ordersPending,
				ordersPaid,
				paymentsCount: paymentsPaidAgg._count,
				revenueTodayUzs: paymentsTodayAgg._sum.amountUzs ?? 0,
				revenueTotalUzs: incomeUzs,
				refundsPending,
				cinemas,
				movies,
				halls,
			},
			cashflow: {
				incomeUzs,
				expenseUzs,
				netUzs: incomeUzs - expenseUzs,
			},
			todaySessions,
			recentOrders: recentOrders.map((o) => ({
				id: o.id,
				publicNumber: o.publicNumber,
				status: o.status,
				totalUzs: o.totalUzs,
				createdAt: o.createdAt,
				cinemaName: o.cinema.name,
				movieTitle: o.session.movie.title,
				customer:
					[o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.user.email || "—",
			})),
			recentPayments: recentPayments.map((p) => ({
				id: p.id,
				amountUzs: p.amountUzs,
				status: p.status,
				provider: p.provider,
				createdAt: p.createdAt,
				orderNumber: p.order.publicNumber,
				cinemaName: p.order.cinema.name,
			})),
			revenueTrend: [...trendMap.entries()].map(([date, v]) => ({
				date,
				...v,
				netUzs: v.incomeUzs - v.expenseUzs,
			})),
		};
	}
}
