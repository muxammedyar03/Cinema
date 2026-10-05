import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Paid GA occupancy follows individual tickets, including pending refunds. */
export async function gaQtyBySessionIds(
	db: Db,
	sessionIds: string[],
): Promise<Map<string, number>> {
	const map = new Map<string, number>();
	if (!sessionIds.length) return map;
	const [pending, paid] = await Promise.all([
		db.orderItem.findMany({
			where: {
				type: "GENERAL_ADMISSION",
				order: { sessionId: { in: sessionIds }, status: "PENDING_PAYMENT" },
			},
			select: { quantity: true, order: { select: { sessionId: true } } },
		}),
		db.ticket.groupBy({
			by: ["sessionId"],
			where: {
				sessionId: { in: sessionIds },
				type: "GENERAL_ADMISSION",
				status: { in: ["ACTIVE", "USED"] },
				order: { status: { in: ["PAID", "REFUND_PENDING"] } },
			},
			_count: { _all: true },
		}),
	]);
	for (const row of pending)
		map.set(row.order.sessionId, (map.get(row.order.sessionId) ?? 0) + row.quantity);
	for (const row of paid) map.set(row.sessionId, (map.get(row.sessionId) ?? 0) + row._count._all);
	return map;
}

export async function countSessionOccupied(db: Db, sessionId: string): Promise<number> {
	const [seats, ga] = await Promise.all([
		db.sessionSeat.count({ where: { sessionId, status: { in: ["HELD", "SOLD", "BLOCKED"] } } }),
		gaQtyBySessionIds(db, [sessionId]),
	]);
	return seats + (ga.get(sessionId) ?? 0);
}
