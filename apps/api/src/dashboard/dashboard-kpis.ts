import { bucketKey, type ChartRange } from "./dashboard-time";

export const PAID_ORDER_STATUSES = ["PAID", "REFUND_PENDING", "REFUNDED"] as const;

export function isPaidOrderStatus(status: string): boolean {
	return status === "PAID" || status === "REFUND_PENDING" || status === "REFUNDED";
}

export function isResolvedHoldStatus(status: string): boolean {
	return isPaidOrderStatus(status) || status === "EXPIRED" || status === "CANCELLED";
}

export function ratio(numerator: number, denominator: number): number | null {
	if (denominator <= 0) return null;
	return numerator / denominator;
}

/** Seated: SOLD / (seats − BLOCKED). GA: paid GA qty / hall capacity. */
export function sessionOccupancy(input: {
	capacity: number;
	seatTotal: number;
	seatBlocked: number;
	seatSold: number;
	gaPaidQty: number;
}): { sold: number; sellable: number } {
	if (input.seatTotal > 0) {
		return {
			sold: input.seatSold,
			sellable: Math.max(0, input.seatTotal - input.seatBlocked),
		};
	}
	return { sold: input.gaPaidQty, sellable: Math.max(0, input.capacity) };
}

export type OrderKpiRow = { status: string; totalUzs: number };

export function summarizeOrders(orders: OrderKpiRow[]) {
	let paidOrders = 0;
	let holdsResolved = 0;
	let pendingHolds = 0;
	let gmvUzs = 0;
	let refundedOrders = 0;
	for (const order of orders) {
		if (order.status === "PENDING_PAYMENT") pendingHolds += 1;
		if (isResolvedHoldStatus(order.status)) holdsResolved += 1;
		if (isPaidOrderStatus(order.status)) {
			paidOrders += 1;
			gmvUzs += order.totalUzs;
		}
		if (order.status === "REFUNDED" || order.status === "REFUND_PENDING") {
			refundedOrders += 1;
		}
	}
	return { paidOrders, holdsResolved, pendingHolds, gmvUzs, refundedOrders };
}

export type KpiSnapshot = {
	occupancyRate: number | null;
	soldSeats: number;
	sellableSeats: number;
	sessions: number;
	conversionRate: number | null;
	paidOrders: number;
	holdsResolved: number;
	pendingHolds: number;
	gmvUzs: number | null;
	refundRate: number | null;
	refundedAmountUzs: number | null;
	refundedOrders: number;
};

export type KpiTrendPoint = {
	bucket: string;
	occupancyRate: number | null;
	conversionRate: number | null;
	refundRate: number | null;
	gmvUzs: number | null;
	refundedUzs: number | null;
	soldSeats: number;
	sellableSeats: number;
	paidOrders: number;
	holdsResolved: number;
};

export function emptyKpis(): KpiSnapshot {
	return {
		occupancyRate: null,
		soldSeats: 0,
		sellableSeats: 0,
		sessions: 0,
		conversionRate: null,
		paidOrders: 0,
		holdsResolved: 0,
		pendingHolds: 0,
		gmvUzs: 0,
		refundRate: null,
		refundedAmountUzs: 0,
		refundedOrders: 0,
	};
}

export function buildKpis(input: {
	soldSeats: number;
	sellableSeats: number;
	sessions: number;
	orders: OrderKpiRow[];
	refundedAmountUzs: number;
	refundedOrderIds: Iterable<string>;
}): KpiSnapshot {
	const orders = summarizeOrders(input.orders);
	const refundedOrderCount = Math.max(orders.refundedOrders, new Set(input.refundedOrderIds).size);
	const occupancyRate = ratio(input.soldSeats, input.sellableSeats);
	const conversionRate = ratio(orders.paidOrders, orders.holdsResolved);
	const refundRate =
		ratio(input.refundedAmountUzs, orders.gmvUzs) ?? ratio(refundedOrderCount, orders.paidOrders);
	return {
		occupancyRate,
		soldSeats: input.soldSeats,
		sellableSeats: input.sellableSeats,
		sessions: input.sessions,
		conversionRate,
		paidOrders: orders.paidOrders,
		holdsResolved: orders.holdsResolved,
		pendingHolds: orders.pendingHolds,
		gmvUzs: orders.gmvUzs,
		refundRate,
		refundedAmountUzs: input.refundedAmountUzs,
		refundedOrders: refundedOrderCount,
	};
}

export function maskMoneyKpis(kpis: KpiSnapshot, hideMoney: boolean): KpiSnapshot {
	if (!hideMoney) return kpis;
	return {
		...kpis,
		gmvUzs: null,
		refundedAmountUzs: null,
	};
}

type BucketAcc = {
	soldSeats: number;
	sellableSeats: number;
	sessions: number;
	paidOrders: number;
	holdsResolved: number;
	gmvUzs: number;
	refundedUzs: number;
	refundedOrders: number;
};

function emptyBucket(): BucketAcc {
	return {
		soldSeats: 0,
		sellableSeats: 0,
		sessions: 0,
		paidOrders: 0,
		holdsResolved: 0,
		gmvUzs: 0,
		refundedUzs: 0,
		refundedOrders: 0,
	};
}

export function buildTrend(input: {
	range: ChartRange;
	buckets: string[];
	hideMoney: boolean;
	sessions: Array<{ at: Date; sold: number; sellable: number }>;
	orders: Array<{ at: Date; status: string; totalUzs: number }>;
	refunds: Array<{ at: Date; amountUzs: number }>;
}): KpiTrendPoint[] {
	const map = new Map<string, BucketAcc>();
	for (const bucket of input.buckets) {
		map.set(bucket, emptyBucket());
	}

	for (const session of input.sessions) {
		const row = map.get(bucketKey(session.at, input.range));
		if (!row) continue;
		row.sessions += 1;
		row.soldSeats += session.sold;
		row.sellableSeats += session.sellable;
	}

	for (const order of input.orders) {
		const row = map.get(bucketKey(order.at, input.range));
		if (!row) continue;
		if (isResolvedHoldStatus(order.status)) row.holdsResolved += 1;
		if (isPaidOrderStatus(order.status)) {
			row.paidOrders += 1;
			row.gmvUzs += order.totalUzs;
		}
		if (order.status === "REFUNDED" || order.status === "REFUND_PENDING") {
			row.refundedOrders += 1;
		}
	}

	for (const refund of input.refunds) {
		const row = map.get(bucketKey(refund.at, input.range));
		if (!row) continue;
		row.refundedUzs += refund.amountUzs;
	}

	return input.buckets.map((bucket) => {
		const row = map.get(bucket) ?? emptyBucket();
		const occupancyRate = ratio(row.soldSeats, row.sellableSeats);
		const conversionRate = ratio(row.paidOrders, row.holdsResolved);
		const refundRate =
			ratio(row.refundedUzs, row.gmvUzs) ?? ratio(row.refundedOrders, row.paidOrders);
		return {
			bucket,
			occupancyRate,
			conversionRate,
			refundRate,
			gmvUzs: input.hideMoney ? null : row.gmvUzs,
			refundedUzs: input.hideMoney ? null : row.refundedUzs,
			soldSeats: row.soldSeats,
			sellableSeats: row.sellableSeats,
			paidOrders: row.paidOrders,
			holdsResolved: row.holdsResolved,
		};
	});
}
