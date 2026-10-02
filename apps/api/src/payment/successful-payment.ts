import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
	assertOrderOwnedByTelegram,
	assertPendingPayment,
	type InvoiceOrder,
	PaymentRuleError,
	readInvoicePayload,
} from "./invoice-rules";
import { telegramMinorMatchesUzs } from "./telegram-amount";

export type SuccessfulPaymentInput = {
	orderId: string;
	totalAmount: number;
	currency: string;
	telegramPaymentChargeId: string;
	providerPaymentChargeId: string;
	telegramUserId?: string;
};

export type SuccessfulPaymentResult = {
	orderId: string;
	status: "PAID";
	alreadyProcessed: boolean;
};

type OrderWithItems = InvoiceOrder & {
	sessionId: string;
	items: Array<{
		id: string;
		type: "SEAT" | "GENERAL_ADMISSION";
		quantity: number;
		seatId: string | null;
	}>;
	tickets: Array<{ id: string }>;
};

export function newTicketCode(): string {
	return randomBytes(8).toString("hex").toUpperCase();
}

export function isUniqueConstraint(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code: unknown }).code === "P2002"
	);
}

export async function recoverDuplicateCharge(
	db: Prisma.TransactionClient,
	input: Pick<SuccessfulPaymentInput, "orderId" | "telegramPaymentChargeId">,
): Promise<SuccessfulPaymentResult | null> {
	const existing = await db.payment.findUnique({
		where: { telegramPaymentChargeId: input.telegramPaymentChargeId },
	});
	if (existing && existing.orderId === input.orderId && existing.status === "PAID") {
		return { orderId: input.orderId, status: "PAID", alreadyProcessed: true };
	}
	return null;
}

/**
 * Click's test terminal sends provider_payment_charge_id "-1" for every payment.
 * That value cannot be the unique provider key or only the first test payment can be stored.
 */
export function providerPaymentKey(providerChargeId: string, telegramChargeId: string): string {
	const charge = providerChargeId.trim();
	if (charge === "" || charge === "-1" || charge === "0") return telegramChargeId;
	return charge;
}

function assertChargeIds(input: SuccessfulPaymentInput): void {
	const charge = readInvoicePayload(input.telegramPaymentChargeId);
	const providerCharge = readInvoicePayload(input.providerPaymentChargeId);
	if (!charge.ok || !providerCharge.ok) {
		throw new PaymentRuleError(400, "CHARGE_INVALID", "Некорректные данные платежа");
	}
}

function assertAmountAndPayer(order: InvoiceOrder, input: SuccessfulPaymentInput): void {
	if (input.currency !== "UZS") {
		throw new PaymentRuleError(409, "CURRENCY_MISMATCH", "Валюта должна быть UZS");
	}
	if (input.telegramUserId) {
		assertOrderOwnedByTelegram(order, input.telegramUserId);
	}
	if (!telegramMinorMatchesUzs(input.totalAmount, order.totalUzs)) {
		throw new PaymentRuleError(409, "AMOUNT_MISMATCH", "Сумма не совпадает с заказом");
	}
}

async function alreadyPaidWithCharge(
	tx: Prisma.TransactionClient,
	orderId: string,
	chargeId: string,
): Promise<boolean> {
	const payment = await tx.payment.findUnique({
		where: { telegramPaymentChargeId: chargeId },
	});
	return Boolean(payment && payment.orderId === orderId && payment.status === "PAID");
}

/**
 * Mark a Click/Telegram payment as PAID and issue tickets once.
 * The same telegram_payment_charge_id is a no-op the second time.
 */
export async function recordSuccessfulTelegramPayment(
	tx: Prisma.TransactionClient,
	input: SuccessfulPaymentInput,
	now: Date,
	newCode: () => string = newTicketCode,
): Promise<SuccessfulPaymentResult> {
	const payload = readInvoicePayload(input.orderId);
	if (!payload.ok) {
		throw new PaymentRuleError(400, "PAYLOAD_INVALID", payload.errorMessage);
	}
	assertChargeIds(input);

	if (await alreadyPaidWithCharge(tx, input.orderId, input.telegramPaymentChargeId)) {
		return { orderId: input.orderId, status: "PAID", alreadyProcessed: true };
	}

	const order = (await tx.order.findUnique({
		where: { id: input.orderId },
		include: {
			user: { select: { telegramId: true } },
			items: true,
			tickets: { select: { id: true } },
		},
	})) as (Omit<OrderWithItems, "telegramId"> & { user: { telegramId: string | null } }) | null;

	if (!order || order.id !== payload.orderId) {
		throw new PaymentRuleError(404, "ORDER_NOT_FOUND", "Заказ не найден");
	}

	const view: InvoiceOrder = {
		id: order.id,
		userId: order.userId,
		status: order.status,
		totalUzs: order.totalUzs,
		holdExpiresAt: order.holdExpiresAt,
		telegramId: order.user.telegramId,
	};
	assertAmountAndPayer(view, input);
	assertPendingPayment(view);

	const seatItems = order.items.filter((item) => item.type === "SEAT" && item.seatId);
	if (seatItems.length > 0) {
		const seatItemIds = seatItems.map((item) => item.id);
		const held = await tx.sessionSeat.count({
			where: { orderItemId: { in: seatItemIds }, status: "HELD" },
		});
		if (held !== seatItems.length) {
			if (await alreadyPaidWithCharge(tx, input.orderId, input.telegramPaymentChargeId)) {
				return { orderId: input.orderId, status: "PAID", alreadyProcessed: true };
			}
			throw new PaymentRuleError(409, "HOLD_RELEASED", "Места уже не удерживаются");
		}
		const sold = await tx.sessionSeat.updateMany({
			where: { orderItemId: { in: seatItemIds }, status: "HELD" },
			data: { status: "SOLD", holdExpiresAt: null },
		});
		if (sold.count !== seatItems.length) {
			throw new PaymentRuleError(409, "HOLD_RELEASED", "Места уже не удерживаются");
		}
	} else if (!order.holdExpiresAt || order.holdExpiresAt.getTime() <= now.getTime()) {
		throw new PaymentRuleError(409, "HOLD_EXPIRED", "Время брони истекло");
	}

	const updated = await tx.order.updateMany({
		where: { id: order.id, status: "PENDING_PAYMENT" },
		data: { status: "PAID" },
	});
	if (updated.count !== 1) {
		if (await alreadyPaidWithCharge(tx, input.orderId, input.telegramPaymentChargeId)) {
			return { orderId: input.orderId, status: "PAID", alreadyProcessed: true };
		}
		throw new PaymentRuleError(409, "NOT_PAYABLE", "Заказ уже нельзя оплатить");
	}

	await tx.payment.create({
		data: {
			orderId: order.id,
			provider: "CLICK",
			providerPaymentId: providerPaymentKey(
				input.providerPaymentChargeId,
				input.telegramPaymentChargeId,
			),
			providerPaymentChargeId: input.providerPaymentChargeId,
			telegramPaymentChargeId: input.telegramPaymentChargeId,
			amountUzs: order.totalUzs,
			status: "PAID",
			rawPayload: {
				currency: input.currency,
				totalAmount: input.totalAmount,
				telegramUserId: input.telegramUserId ?? null,
			},
		},
	});

	for (const item of order.items) {
		const count = item.type === "GENERAL_ADMISSION" ? item.quantity : 1;
		for (let i = 0; i < count; i++) {
			await tx.ticket.create({
				data: {
					orderId: order.id,
					sessionId: order.sessionId,
					type: item.type,
					seatId: item.seatId,
					code: newCode(),
					status: "ACTIVE",
				},
			});
		}
	}

	return { orderId: order.id, status: "PAID", alreadyProcessed: false };
}
