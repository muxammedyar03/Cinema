import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	assertCanCreateInvoice,
	assertPreCheckout,
	buildInvoiceCopy,
	INVOICE_PAYLOAD_MAX_BYTES,
	type InvoiceOrder,
	invoicePayloadForOrder,
	PaymentRuleError,
	readInvoicePayload,
} from "../invoice-rules";
import { minPayableUzs } from "../telegram-amount";

const NOW = new Date("2026-10-02T14:00:00.000Z");

function order(overrides: Partial<InvoiceOrder> = {}): InvoiceOrder {
	return {
		id: "ord_owner",
		userId: "user_1",
		status: "PENDING_PAYMENT",
		totalUzs: 45_000,
		holdExpiresAt: new Date(NOW.getTime() + 60_000),
		telegramId: "42",
		...overrides,
	};
}

describe("invoice payload", () => {
	it("uses the order id as an opaque payload within 128 bytes", () => {
		assert.equal(invoicePayloadForOrder("ord_owner"), "ord_owner");
		const max = "a".repeat(INVOICE_PAYLOAD_MAX_BYTES);
		assert.deepEqual(readInvoicePayload(max), { ok: true, orderId: max });
	});

	it("rejects an empty or oversized payload", () => {
		assert.equal(readInvoicePayload("").ok, false);
		const tooLong = "a".repeat(INVOICE_PAYLOAD_MAX_BYTES + 1);
		assert.equal(readInvoicePayload(tooLong).ok, false);
		assert.throws(
			() => invoicePayloadForOrder(tooLong),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "PAYLOAD_INVALID",
		);
	});
});

describe("invoice ownership and payable order", () => {
	it("allows the owner while the hold is active", () => {
		assert.equal(assertCanCreateInvoice(order(), "user_1", NOW), 4_500_000);
	});

	it("rejects a missing order, another user, a paid order, and an expired hold", () => {
		assert.throws(
			() => assertCanCreateInvoice(null, "user_1", NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "ORDER_NOT_FOUND",
		);
		assert.throws(
			() => assertCanCreateInvoice(order(), "user_2", NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "FORBIDDEN",
		);
		assert.throws(
			() => assertCanCreateInvoice(order({ status: "PAID" }), "user_1", NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "ALREADY_PAID",
		);
		assert.throws(
			() =>
				assertCanCreateInvoice(
					order({ holdExpiresAt: new Date(NOW.getTime() - 1) }),
					"user_1",
					NOW,
				),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "HOLD_EXPIRED",
		);
	});

	it("rejects an order below the Telegram UZS minimum", () => {
		assert.throws(
			() => assertCanCreateInvoice(order({ totalUzs: minPayableUzs() - 1 }), "user_1", NOW),
			(err: unknown) => err instanceof Error && err.name === "TelegramAmountError",
		);
	});
});

describe("pre_checkout validation", () => {
	const input = {
		orderId: "ord_owner",
		totalAmount: 4_500_000,
		currency: "UZS",
		telegramUserId: "42",
	};

	it("accepts a matching amount for the Telegram user who owns the order", () => {
		assert.doesNotThrow(() => assertPreCheckout(order(), input, NOW));
	});

	it("rejects another Telegram user, a mismatched amount, and a foreign currency", () => {
		assert.throws(
			() => assertPreCheckout(order(), { ...input, telegramUserId: "99" }, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "FORBIDDEN",
		);
		assert.throws(
			() => assertPreCheckout(order(), { ...input, totalAmount: 4_500_100 }, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "AMOUNT_MISMATCH",
		);
		assert.throws(
			() => assertPreCheckout(order(), { ...input, currency: "USD" }, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "CURRENCY_MISMATCH",
		);
	});

	it("rejects an expired hold even when the amount matches", () => {
		assert.throws(
			() => assertPreCheckout(order({ holdExpiresAt: NOW }), input, NOW),
			(err: unknown) => err instanceof PaymentRuleError && err.code === "HOLD_EXPIRED",
		);
	});
});

describe("buildInvoiceCopy", () => {
	it("puts the film, cinema, session time, and seats into a Russian invoice", () => {
		const copy = buildInvoiceCopy({
			movieTitle: "Интерстеллар",
			cinemaName: "Синема Нукус",
			startsAt: new Date("2026-10-02T14:30:00.000Z"),
			seatLabels: ["A1", "A2"],
			gaQuantity: 0,
		});
		assert.ok(copy.title.length <= 32);
		assert.ok(copy.description.length <= 255);
		assert.match(copy.title, /Интерстеллар/);
		assert.match(copy.description, /Интерстеллар/);
		assert.match(copy.description, /Синема Нукус/);
		assert.match(copy.description, /19:30/);
		assert.match(copy.description, /A1, A2/);
	});

	it("clips a long title to 32 characters", () => {
		const copy = buildInvoiceCopy({
			movieTitle: "Очень длинное название фильма которое не помещается в счёт",
			cinemaName: "Зал",
			startsAt: new Date("2026-10-02T14:30:00.000Z"),
			seatLabels: [],
			gaQuantity: 2,
		});
		assert.equal(Array.from(copy.title).length, 32);
		assert.match(copy.description, /Билетов: 2/);
	});
});
