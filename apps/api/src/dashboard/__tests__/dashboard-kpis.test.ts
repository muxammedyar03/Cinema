import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildKpis,
	buildTrend,
	emptyKpis,
	maskMoneyKpis,
	ratio,
	sessionOccupancy,
	summarizeOrders,
} from "../dashboard-kpis";

describe("dashboard-kpis", () => {
	it("returns null ratio when the denominator is empty", () => {
		assert.equal(ratio(1, 0), null);
		assert.equal(ratio(0, 0), null);
		assert.equal(ratio(3, 4), 0.75);
	});

	it("computes seated occupancy excluding blocked seats", () => {
		assert.deepEqual(
			sessionOccupancy({
				capacity: 100,
				seatTotal: 80,
				seatBlocked: 10,
				seatSold: 35,
				gaPaidQty: 99,
			}),
			{ sold: 35, sellable: 70 },
		);
	});

	it("computes GA occupancy against hall capacity when no seats exist", () => {
		assert.deepEqual(
			sessionOccupancy({
				capacity: 120,
				seatTotal: 0,
				seatBlocked: 0,
				seatSold: 0,
				gaPaidQty: 40,
			}),
			{ sold: 40, sellable: 120 },
		);
	});

	it("treats paid/refunded orders as converted holds and GMV as gross", () => {
		const summary = summarizeOrders([
			{ status: "PENDING_PAYMENT", totalUzs: 100 },
			{ status: "EXPIRED", totalUzs: 200 },
			{ status: "CANCELLED", totalUzs: 50 },
			{ status: "PAID", totalUzs: 1000 },
			{ status: "REFUNDED", totalUzs: 400 },
		]);
		assert.equal(summary.pendingHolds, 1);
		assert.equal(summary.holdsResolved, 4);
		assert.equal(summary.paidOrders, 2);
		assert.equal(summary.gmvUzs, 1400);
		assert.equal(summary.refundedOrders, 1);
	});

	it("builds occupancy, conversion, GMV and refund-rate KPIs from real parts", () => {
		const kpis = buildKpis({
			soldSeats: 20,
			sellableSeats: 50,
			sessions: 2,
			orders: [
				{ status: "PAID", totalUzs: 10000 },
				{ status: "EXPIRED", totalUzs: 5000 },
				{ status: "PAID", totalUzs: 20000 },
			],
			refundedAmountUzs: 1500,
			refundedOrderIds: ["o1"],
		});
		assert.equal(kpis.occupancyRate, 0.4);
		assert.equal(kpis.conversionRate, 2 / 3);
		assert.equal(kpis.gmvUzs, 30000);
		assert.equal(kpis.refundRate, 1500 / 30000);
		assert.equal(kpis.refundedOrders, 1);
	});

	it("falls back to count-based refund rate when GMV is zero", () => {
		const kpis = buildKpis({
			soldSeats: 0,
			sellableSeats: 0,
			sessions: 0,
			orders: [],
			refundedAmountUzs: 0,
			refundedOrderIds: [],
		});
		assert.equal(kpis.refundRate, null);
		assert.deepEqual({ ...kpis, occupancyRate: kpis.occupancyRate }, emptyKpis());
	});

	it("hides money fields for Super Admin without dropping rates", () => {
		const kpis = buildKpis({
			soldSeats: 10,
			sellableSeats: 20,
			sessions: 1,
			orders: [{ status: "PAID", totalUzs: 8000 }],
			refundedAmountUzs: 800,
			refundedOrderIds: ["r1"],
		});
		const masked = maskMoneyKpis(kpis, true);
		assert.equal(masked.gmvUzs, null);
		assert.equal(masked.refundedAmountUzs, null);
		assert.equal(masked.occupancyRate, 0.5);
		assert.equal(masked.conversionRate, 1);
		assert.equal(masked.refundRate, 0.1);
	});

	it("buckets daily GMV, occupancy and conversion", () => {
		const trend = buildTrend({
			range: "daily",
			buckets: ["2026-09-10", "2026-09-11"],
			hideMoney: false,
			sessions: [
				{ at: new Date("2026-09-10T12:00:00+05:00"), sold: 10, sellable: 20 },
				{ at: new Date("2026-09-11T18:00:00+05:00"), sold: 5, sellable: 20 },
			],
			orders: [
				{ at: new Date("2026-09-10T09:00:00+05:00"), status: "PAID", totalUzs: 1000 },
				{ at: new Date("2026-09-11T09:00:00+05:00"), status: "EXPIRED", totalUzs: 500 },
			],
			refunds: [{ at: new Date("2026-09-10T20:00:00+05:00"), amountUzs: 100 }],
		});
		assert.equal(trend[0]?.gmvUzs, 1000);
		assert.equal(trend[0]?.occupancyRate, 0.5);
		assert.equal(trend[0]?.refundRate, 0.1);
		assert.equal(trend[1]?.conversionRate, 0);
		assert.equal(trend[1]?.gmvUzs, 0);
	});

	it("masks weekly money series for Super Admin", () => {
		const trend = buildTrend({
			range: "weekly",
			buckets: ["2026-09-07"],
			hideMoney: true,
			sessions: [],
			orders: [{ at: new Date("2026-09-11T12:00:00+05:00"), status: "PAID", totalUzs: 99 }],
			refunds: [],
		});
		assert.equal(trend[0]?.gmvUzs, null);
		assert.equal(trend[0]?.refundedUzs, null);
		assert.equal(trend[0]?.paidOrders, 1);
		assert.equal(trend[0]?.conversionRate, 1);
	});
});
