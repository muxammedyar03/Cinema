import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Prisma } from "@prisma/client";
import { PaymentRuleError } from "../invoice-rules";
import {
	isUniqueConstraint,
	recordSuccessfulTelegramPayment,
	recoverDuplicateCharge,
	type SuccessfulPaymentInput,
} from "../successful-payment";

const NOW = new Date("2026-10-02T14:00:00.000Z");

type SeatRow = {
	id: string;
	orderItemId: string | null;
	status: string;
	holdExpiresAt: Date | null;
};
type PaymentRow = {
	id: string;
	orderId: string;
	status: string;
	provider: string;
	providerPaymentId: string | null;
	telegramPaymentChargeId: string | null;
	providerPaymentChargeId: string | null;
	amountUzs: number;
};
type TicketRow = { id: string; orderId: string; code: string; seatId: string | null; type: string };
type OrderRow = {
	id: string;
	userId: string;
	sessionId: string;
	status: string;
	totalUzs: number;
	holdExpiresAt: Date | null;
	user: { telegramId: string | null };
	items: Array<{
		id: string;
		type: "SEAT" | "GENERAL_ADMISSION";
		quantity: number;
		seatId: string | null;
		unitPriceUzs: number;
	}>;
	tickets: TicketRow[];
};

function memory() {
	const orders = new Map<string, OrderRow>();
	const seats: SeatRow[] = [];
	const payments: PaymentRow[] = [];
	let seq = 0;

	const db = {
		payment: {
			findUnique: async ({ where }: { where: { telegramPaymentChargeId: string } }) =>
				payments.find((row) => row.telegramPaymentChargeId === where.telegramPaymentChargeId) ??
				null,
			create: async ({ data }: { data: Omit<PaymentRow, "id"> }) => {
				const duplicate = payments.some(
					(row) =>
						row.telegramPaymentChargeId === data.telegramPaymentChargeId ||
						(row.provider === data.provider &&
							row.providerPaymentId !== null &&
							row.providerPaymentId === data.providerPaymentId),
				);
				if (duplicate) {
					const err = new Error("Unique constraint") as Error & { code: string };
					err.code = "P2002";
					throw err;
				}
				const row = { ...data, id: `pay_${++seq}` };
				payments.push(row);
				return row;
			},
		},
		order: {
			findUnique: async ({ where }: { where: { id: string } }) => orders.get(where.id) ?? null,
			updateMany: async ({
				where,
				data,
			}: {
				where: { id: string; status: string };
				data: { status: string };
			}) => {
				const order = orders.get(where.id);
				if (!order || order.status !== where.status) return { count: 0 };
				order.status = data.status;
				return { count: 1 };
			},
		},
		ticket: {
			create: async ({
				data,
			}: {
				data: {
					orderId: string;
					code: string;
					seatId: string | null;
					type: string;
					sessionId: string;
				};
			}) => {
				const order = orders.get(data.orderId);
				if (!order) throw new Error("missing order");
				const ticket: TicketRow = {
					id: `t_${++seq}`,
					orderId: data.orderId,
					code: data.code,
					seatId: data.seatId,
					type: data.type,
				};
				order.tickets.push(ticket);
				return ticket;
			},
		},
		sessionSeat: {
			count: async ({ where }: { where: { orderItemId: { in: string[] }; status: string } }) =>
				seats.filter(
					(seat) =>
						seat.status === where.status &&
						seat.orderItemId !== null &&
						where.orderItemId.in.includes(seat.orderItemId),
				).length,
			updateMany: async ({
				where,
				data,
			}: {
				where: { orderItemId: { in: string[] }; status: string };
				data: { status: string; holdExpiresAt: null };
			}) => {
				let count = 0;
				for (const seat of seats) {
					if (
						seat.status === where.status &&
						seat.orderItemId &&
						where.orderItemId.in.includes(seat.orderItemId)
					) {
						seat.status = data.status;
						seat.holdExpiresAt = data.holdExpiresAt;
						count += 1;
					}
				}
				return { count };
			},
		},
	};

	return { orders, seats, payments, db: db as unknown as Prisma.TransactionClient };
}

function seatedOrder(): OrderRow {
	return {
		id: "ord_1",
		userId: "user_1",
		sessionId: "ses_1",
		status: "PENDING_PAYMENT",
		totalUzs: 45_000,
		holdExpiresAt: new Date(NOW.getTime() + 60_000),
		user: { telegramId: "42" },
		items: [
			{ id: "item_a", type: "SEAT", quantity: 1, seatId: "seat_a", unitPriceUzs: 20_000 },
			{ id: "item_b", type: "SEAT", quantity: 1, seatId: "seat_b", unitPriceUzs: 25_000 },
		],
		tickets: [],
	};
}

const paidInput: SuccessfulPaymentInput = {
	orderId: "ord_1",
	totalAmount: 4_500_000,
	currency: "UZS",
	telegramPaymentChargeId: "tg_charge_1",
	providerPaymentChargeId: "click_charge_1",
	telegramUserId: "42",
};

describe("recordSuccessfulTelegramPayment", () => {
	it("fulfills Rahmat once without labelling it as Click", async () => {
		const store = memory();
		store.orders.set("ord_1", seatedOrder());
		store.seats.push(
			{ id: "ss_a", orderItemId: "item_a", status: "HELD", holdExpiresAt: new Date() },
			{ id: "ss_b", orderItemId: "item_b", status: "HELD", holdExpiresAt: new Date() },
		);
		const input = {
			...paidInput,
			provider: "RAHMAT" as const,
			telegramPaymentChargeId: "rahmat:uuid1",
			providerPaymentChargeId: "uuid1",
		};
		await recordSuccessfulTelegramPayment(store.db, input, NOW, () => "RAHMAT-CODE");
		const again = await recordSuccessfulTelegramPayment(store.db, input, NOW);
		assert.equal(again.alreadyProcessed, true);
		assert.equal(store.payments.length, 1);
		assert.equal(store.payments[0]?.provider, "RAHMAT");
		assert.equal(store.payments[0]?.providerPaymentId, "uuid1");
		assert.equal(store.orders.get("ord_1")?.tickets.length, 2);
	});

	it("marks the order paid, sells held seats, and issues one ticket per seat", async () => {
		const store = memory();
		store.orders.set("ord_1", seatedOrder());
		store.seats.push(
			{ id: "ss_a", orderItemId: "item_a", status: "HELD", holdExpiresAt: new Date() },
			{ id: "ss_b", orderItemId: "item_b", status: "HELD", holdExpiresAt: new Date() },
		);
		let n = 0;

		const result = await recordSuccessfulTelegramPayment(
			store.db,
			paidInput,
			NOW,
			() => `CODE${++n}`,
		);

		assert.deepEqual(result, { orderId: "ord_1", status: "PAID", alreadyProcessed: false });
		assert.equal(store.orders.get("ord_1")?.status, "PAID");
		assert.deepEqual(
			store.orders.get("ord_1")?.tickets.map((ticket) => ticket.code),
			["CODE1", "CODE2"],
		);
		assert.deepEqual(
			store.seats.map((seat) => seat.status),
			["SOLD", "SOLD"],
		);
		assert.equal(store.payments.length, 1);
		assert.equal(store.payments[0]?.telegramPaymentChargeId, "tg_charge_1");
		assert.equal(store.payments[0]?.providerPaymentChargeId, "click_charge_1");
		assert.equal(store.payments[0]?.provider, "CLICK");
		assert.equal(store.payments[0]?.status, "PAID");
	});

	it("is idempotent on the same telegram charge id and does not issue more tickets", async () => {
		const store = memory();
		store.orders.set("ord_1", seatedOrder());
		store.seats.push(
			{ id: "ss_a", orderItemId: "item_a", status: "HELD", holdExpiresAt: new Date() },
			{ id: "ss_b", orderItemId: "item_b", status: "HELD", holdExpiresAt: new Date() },
		);
		let n = 0;
		const codes = () => `CODE${++n}`;

		await recordSuccessfulTelegramPayment(store.db, paidInput, NOW, codes);
		const again = await recordSuccessfulTelegramPayment(store.db, paidInput, NOW, codes);

		assert.equal(again.alreadyProcessed, true);
		assert.equal(store.orders.get("ord_1")?.tickets.length, 2);
		assert.equal(store.payments.length, 1);
		assert.equal(n, 2);
	});

	it("issues tickets for a second Click test payment that reuses provider charge id -1", async () => {
		const store = memory();
		const first = seatedOrder();
		const second: OrderRow = {
			...seatedOrder(),
			id: "ord_2",
			items: [{ id: "item_c", type: "SEAT", quantity: 1, seatId: "seat_c", unitPriceUzs: 45_000 }],
			tickets: [],
		};
		store.orders.set("ord_1", first);
		store.orders.set("ord_2", second);
		store.seats.push(
			{ id: "ss_a", orderItemId: "item_a", status: "HELD", holdExpiresAt: new Date() },
			{ id: "ss_b", orderItemId: "item_b", status: "HELD", holdExpiresAt: new Date() },
			{ id: "ss_c", orderItemId: "item_c", status: "HELD", holdExpiresAt: new Date() },
		);
		let n = 0;
		const codes = () => `CODE${++n}`;
		const testCharge = {
			...paidInput,
			providerPaymentChargeId: "-1",
		};

		await recordSuccessfulTelegramPayment(store.db, testCharge, NOW, codes);
		const secondResult = await recordSuccessfulTelegramPayment(
			store.db,
			{
				...testCharge,
				orderId: "ord_2",
				telegramPaymentChargeId: "tg_charge_2",
			},
			NOW,
			codes,
		);

		assert.equal(secondResult.alreadyProcessed, false);
		assert.equal(store.orders.get("ord_2")?.status, "PAID");
		assert.equal(store.orders.get("ord_2")?.tickets.length, 1);
		assert.equal(store.payments[0]?.providerPaymentId, "tg_charge_1");
		assert.equal(store.payments[0]?.providerPaymentChargeId, "-1");
		assert.equal(store.payments[1]?.providerPaymentId, "tg_charge_2");
	});

	it("recovers a unique-constraint race as the same paid order", async () => {
		const store = memory();
		store.payments.push({
			id: "pay_existing",
			orderId: "ord_1",
			status: "PAID",
			provider: "CLICK",
			providerPaymentId: "click_charge_1",
			telegramPaymentChargeId: "tg_charge_1",
			providerPaymentChargeId: "click_charge_1",
			amountUzs: 45_000,
		});
		const err = new Error("Unique constraint") as Error & { code: string };
		err.code = "P2002";
		assert.equal(isUniqueConstraint(err), true);
		const recovered = await recoverDuplicateCharge(store.db, paidInput);
		assert.deepEqual(recovered, { orderId: "ord_1", status: "PAID", alreadyProcessed: true });
	});

	it("does not fulfill a second charge after the order is already paid", async () => {
		const store = memory();
		store.orders.set("ord_1", seatedOrder());
		store.seats.push(
			{ id: "ss_a", orderItemId: "item_a", status: "HELD", holdExpiresAt: new Date() },
			{ id: "ss_b", orderItemId: "item_b", status: "HELD", holdExpiresAt: new Date() },
		);
		await recordSuccessfulTelegramPayment(store.db, paidInput, NOW, () => "ONCE");

		await assert.rejects(
			() =>
				recordSuccessfulTelegramPayment(
					store.db,
					{
						...paidInput,
						telegramPaymentChargeId: "tg_charge_2",
						providerPaymentChargeId: "click_2",
					},
					NOW,
					() => "TWICE",
				),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "ALREADY_PAID",
		);
		assert.equal(store.orders.get("ord_1")?.tickets.length, 2);
		assert.equal(store.payments.length, 1);
	});

	it("rejects a mismatched amount and a different Telegram user without writing", async () => {
		const store = memory();
		store.orders.set("ord_1", seatedOrder());
		store.seats.push({
			id: "ss_a",
			orderItemId: "item_a",
			status: "HELD",
			holdExpiresAt: new Date(),
		});

		await assert.rejects(
			() => recordSuccessfulTelegramPayment(store.db, { ...paidInput, totalAmount: 100 }, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "AMOUNT_MISMATCH",
		);
		await assert.rejects(
			() => recordSuccessfulTelegramPayment(store.db, { ...paidInput, telegramUserId: "7" }, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "FORBIDDEN",
		);
		assert.equal(store.orders.get("ord_1")?.status, "PENDING_PAYMENT");
		assert.equal(store.payments.length, 0);
		assert.equal(store.seats[0]?.status, "HELD");
	});

	it("does not sell seats that are no longer held", async () => {
		const store = memory();
		store.orders.set("ord_1", seatedOrder());
		store.seats.push(
			{ id: "ss_a", orderItemId: "item_a", status: "AVAILABLE", holdExpiresAt: null },
			{ id: "ss_b", orderItemId: "item_b", status: "HELD", holdExpiresAt: new Date() },
		);

		await assert.rejects(
			() => recordSuccessfulTelegramPayment(store.db, paidInput, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "HOLD_RELEASED",
		);
		assert.equal(store.orders.get("ord_1")?.status, "PENDING_PAYMENT");
		assert.equal(store.orders.get("ord_1")?.tickets.length, 0);
		assert.equal(store.seats[1]?.status, "HELD");
	});

	it("issues one ticket per general-admission quantity", async () => {
		const store = memory();
		store.orders.set("ord_1", {
			...seatedOrder(),
			items: [
				{
					id: "item_ga",
					type: "GENERAL_ADMISSION",
					quantity: 3,
					seatId: null,
					unitPriceUzs: 15_000,
				},
			],
		});
		let n = 0;
		await recordSuccessfulTelegramPayment(store.db, paidInput, NOW, () => `GA${++n}`);
		assert.equal(store.orders.get("ord_1")?.tickets.length, 3);
		assert.equal(store.orders.get("ord_1")?.status, "PAID");
	});

	it("does not issue general-admission tickets after the hold expires", async () => {
		const store = memory();
		const expired = seatedOrder();
		expired.holdExpiresAt = new Date(NOW.getTime() - 1);
		expired.items = [
			{ id: "item_ga", type: "GENERAL_ADMISSION", quantity: 1, seatId: null, unitPriceUzs: 45_000 },
		];
		store.orders.set("ord_1", expired);

		await assert.rejects(
			() => recordSuccessfulTelegramPayment(store.db, paidInput, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "HOLD_EXPIRED",
		);
		assert.equal(store.payments.length, 0);
	});
});
