import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionUser } from "@cinema/types";
import type { PrismaService } from "../../prisma/prisma.service";
import { RefundService } from "../refund.service";

const customer = { id: "user", role: "CUSTOMER", staff: [] } as unknown as SessionUser;
const input = { ticketIds: ["t1"], idempotencyKey: "00000000-0000-4000-8000-000000000001" };
function fixture() {
	const order = {
		id: "o",
		userId: "user",
		cinemaId: "c",
		sessionId: "s",
		status: "PAID",
		session: { startsAt: new Date(Date.now() + 86400000) },
		items: [{ type: "SEAT", seatId: "seat", unitPriceUzs: 45000 }],
		tickets: [{ id: "t1", status: "ACTIVE", type: "SEAT", seatId: "seat" }],
		payments: [{ id: "p", status: "PAID", amountUzs: 45000 }],
		refunds: [] as Array<{
			status: string;
			ticketIds: string[];
			paymentId: string;
			amountUzs: number;
		}>,
	};
	const created: Array<Record<string, unknown>> = [];
	let previous: Record<string, unknown> | null = null;
	const tx = {
		$queryRaw: async () => [],
		order: {
			findUnique: async () => order,
			update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(order, data),
		},
		payment: { update: async () => ({}) },
		refund: {
			findUnique: async () => previous,
			create: async ({ data }: { data: Record<string, unknown> }) => {
				const row = { id: "r", status: "PENDING", ...data, reason: data.reason ?? null };
				created.push(row);
				previous = row;
				return row;
			},
		},
	};
	const service = new RefundService({
		$transaction: async (fn: (tx: unknown) => unknown) => fn(tx),
	} as unknown as PrismaService);
	return { order, created, service };
}
test("Click request persists PENDING and never declares money returned", async () => {
	const f = fixture();
	const result = await f.service.request(customer, "o", input);
	assert.equal(result.status, "PENDING");
	assert.equal(result.processingMode, "MANUAL");
	assert.equal(result.amountUzs, 45000);
	assert.equal(f.order.tickets[0].status, "ACTIVE");
	assert.equal(f.order.status, "REFUND_PENDING");
});
test("same idempotency key does not create a second refund", async () => {
	const f = fixture();
	await f.service.request(customer, "o", input);
	await f.service.request(customer, "o", input);
	assert.equal(f.created.length, 1);
});
test("a different owner cannot request a refund", async () => {
	const f = fixture();
	await assert.rejects(f.service.request({ ...customer, id: "other" }, "o", input));
	assert.equal(f.created.length, 0);
});
test("used tickets and the closed time window reject without changes", async () => {
	const f = fixture();
	f.order.tickets[0].status = "USED";
	await assert.rejects(f.service.request(customer, "o", input));
	f.order.tickets[0].status = "ACTIVE";
	f.order.session.startsAt = new Date();
	await assert.rejects(f.service.request(customer, "o", input));
	assert.equal(f.created.length, 0);
});
test("overlapping in-flight ticket requests cannot double reserve the amount", async () => {
	const f = fixture();
	f.order.refunds.push({ status: "PENDING", ticketIds: ["t1"], paymentId: "p", amountUzs: 45000 });
	await assert.rejects(f.service.request(customer, "o", input));
	assert.equal(f.created.length, 0);
});
