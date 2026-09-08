import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Occupied people = seat HELD/SOLD/BLOCKED + active GA order quantities */
export async function countSessionOccupied(db: Db, sessionId: string): Promise<number> {
	const [seatOccupied, gaItems] = await Promise.all([
		db.sessionSeat.count({
			where: {
				sessionId,
				status: { in: ["HELD", "SOLD", "BLOCKED"] },
			},
		}),
		db.orderItem.findMany({
			where: {
				type: "GENERAL_ADMISSION",
				order: {
					sessionId,
					status: { in: ["PENDING_PAYMENT", "PAID"] },
				},
			},
			select: { quantity: true },
		}),
	]);
	const gaQty = gaItems.reduce((n, i) => n + i.quantity, 0);
	return seatOccupied + gaQty;
}

export async function gaQtyBySessionIds(
	db: Db,
	sessionIds: string[],
): Promise<Map<string, number>> {
	const map = new Map<string, number>();
	if (sessionIds.length === 0) return map;
	const rows = await db.orderItem.findMany({
		where: {
			type: "GENERAL_ADMISSION",
			order: {
				sessionId: { in: sessionIds },
				status: { in: ["PENDING_PAYMENT", "PAID"] },
			},
		},
		select: {
			quantity: true,
			order: { select: { sessionId: true } },
		},
	});
	for (const row of rows) {
		const id = row.order.sessionId;
		map.set(id, (map.get(id) ?? 0) + row.quantity);
	}
	return map;
}
