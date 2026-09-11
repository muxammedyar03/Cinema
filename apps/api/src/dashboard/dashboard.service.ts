import type { SessionUser } from "@cinema/types";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { buildKpis, buildTrend, maskMoneyKpis, sessionOccupancy } from "./dashboard-kpis";
import { addDays, type ChartRange, dayKey, rangeWindow, startOfToday } from "./dashboard-time";

const CHUNK = 500;

function daysAgo(n: number): Date {
	return addDays(startOfToday(), -n);
}

async function mapInChunks<T, R>(ids: T[], fn: (chunk: T[]) => Promise<R[]>): Promise<R[]> {
	if (ids.length === 0) return [];
	const out: R[] = [];
	for (let i = 0; i < ids.length; i += CHUNK) {
		out.push(...(await fn(ids.slice(i, i + CHUNK))));
	}
	return out;
}

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async overview(user: SessionUser, range: ChartRange = "daily") {
		const hideMoney = user.role === "SUPER_ADMIN";
		const cinemaIds = hideMoney ? null : user.staff.map((s) => s.cinemaId);
		const cinemaFilter: Prisma.SessionWhereInput =
			cinemaIds === null ? {} : { cinemaId: { in: cinemaIds } };
		const orderCinema: Prisma.OrderWhereInput =
			cinemaIds === null ? {} : { cinemaId: { in: cinemaIds } };
		const cinemaWhere: Prisma.CinemaWhereInput =
			cinemaIds === null ? {} : { id: { in: cinemaIds } };
		const paymentWhere: Prisma.PaymentWhereInput =
			cinemaIds === null ? {} : { order: { cinemaId: { in: cinemaIds } } };
		const refundWhere: Prisma.RefundWhereInput =
			cinemaIds === null ? {} : { order: { cinemaId: { in: cinemaIds } } };

		const today = startOfToday();
		const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
		const weekStart = daysAgo(6);
		const window = rangeWindow(range);

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
			kpiSessions,
			kpiOrders,
			kpiRefunds,
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
				where: { status: "PAID", ...paymentWhere },
				_sum: { amountUzs: true },
				_count: true,
			}),
			this.prisma.payment.aggregate({
				where: { status: "PAID", createdAt: { gte: today }, ...paymentWhere },
				_sum: { amountUzs: true },
			}),
			this.prisma.refund.count({
				where: { status: "PENDING", ...refundWhere },
			}),
			this.prisma.refund.aggregate({
				where: { status: "SUCCEEDED", ...refundWhere },
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
				where: paymentWhere,
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
					...paymentWhere,
				},
				select: { amountUzs: true, createdAt: true },
			}),
			this.prisma.refund.findMany({
				where: {
					status: "SUCCEEDED",
					createdAt: { gte: weekStart },
					...refundWhere,
				},
				select: { amountUzs: true, createdAt: true },
			}),
			this.prisma.session.findMany({
				where: {
					...cinemaFilter,
					startsAt: { gte: window.start, lt: window.end },
					status: { in: ["PUBLISHED", "COMPLETED"] },
				},
				select: {
					id: true,
					startsAt: true,
					hall: { select: { capacity: true } },
					_count: { select: { sessionSeats: true } },
				},
			}),
			this.prisma.order.findMany({
				where: {
					...orderCinema,
					createdAt: { gte: window.start, lt: window.end },
				},
				select: { id: true, status: true, totalUzs: true, createdAt: true },
			}),
			this.prisma.refund.findMany({
				where: {
					status: "SUCCEEDED",
					createdAt: { gte: window.start, lt: window.end },
					...refundWhere,
				},
				select: { amountUzs: true, createdAt: true, orderId: true },
			}),
		]);

		const occupancy = await this.occupancyBySession(kpiSessions);

		const kpis = maskMoneyKpis(
			buildKpis({
				soldSeats: occupancy.reduce((n, s) => n + s.sold, 0),
				sellableSeats: occupancy.reduce((n, s) => n + s.sellable, 0),
				sessions: occupancy.length,
				orders: kpiOrders,
				refundedAmountUzs: kpiRefunds.reduce((n, r) => n + r.amountUzs, 0),
				refundedOrderIds: kpiRefunds.map((r) => r.orderId),
			}),
			hideMoney,
		);

		const kpiTrend = buildTrend({
			range,
			buckets: window.buckets,
			hideMoney,
			sessions: occupancy,
			orders: kpiOrders.map((o) => ({
				at: o.createdAt,
				status: o.status,
				totalUzs: o.totalUzs,
			})),
			refunds: kpiRefunds.map((r) => ({ at: r.createdAt, amountUzs: r.amountUzs })),
		});

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
			const row = trendMap.get(dayKey(p.createdAt));
			if (row) row.incomeUzs += p.amountUzs;
		}
		for (const r of refundsWeek) {
			const row = trendMap.get(dayKey(r.createdAt));
			if (row) row.expenseUzs += r.amountUzs;
		}

		const incomeUzs = paymentsPaidAgg._sum.amountUzs ?? 0;
		const expenseUzs = refundsSucceededAgg._sum.amountUzs ?? 0;
		const period = {
			range,
			timezone: "Asia/Tashkent",
			start: window.start,
			end: window.end,
		};

		if (hideMoney) {
			return {
				mode: "platform" as const,
				period,
				kpis,
				kpiTrend,
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
			period,
			kpis,
			kpiTrend,
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

	private async occupancyBySession(
		sessions: Array<{
			id: string;
			startsAt: Date;
			hall: { capacity: number };
			_count: { sessionSeats: number };
		}>,
	) {
		const ids = sessions.map((s) => s.id);
		const seatGroups = await mapInChunks(ids, (chunk) =>
			this.prisma.sessionSeat.groupBy({
				by: ["sessionId", "status"],
				where: { sessionId: { in: chunk } },
				_count: { _all: true },
			}),
		);
		const gaItems = await mapInChunks(ids, (chunk) =>
			this.prisma.orderItem.findMany({
				where: {
					type: "GENERAL_ADMISSION",
					order: {
						sessionId: { in: chunk },
						status: { in: ["PAID", "REFUND_PENDING"] },
					},
				},
				select: { quantity: true, order: { select: { sessionId: true } } },
			}),
		);

		const soldBySession = new Map<string, { sold: number; blocked: number; total: number }>();
		for (const row of seatGroups) {
			const cur = soldBySession.get(row.sessionId) ?? { sold: 0, blocked: 0, total: 0 };
			cur.total += row._count._all;
			if (row.status === "SOLD") cur.sold += row._count._all;
			if (row.status === "BLOCKED") cur.blocked += row._count._all;
			soldBySession.set(row.sessionId, cur);
		}

		const gaBySession = new Map<string, number>();
		for (const item of gaItems) {
			const id = item.order.sessionId;
			gaBySession.set(id, (gaBySession.get(id) ?? 0) + item.quantity);
		}

		return sessions.map((session) => {
			const seats = soldBySession.get(session.id);
			const occ = sessionOccupancy({
				capacity: session.hall.capacity,
				seatTotal: seats?.total ?? session._count.sessionSeats,
				seatBlocked: seats?.blocked ?? 0,
				seatSold: seats?.sold ?? 0,
				gaPaidQty: gaBySession.get(session.id) ?? 0,
			});
			return { at: session.startsAt, ...occ };
		});
	}
}
