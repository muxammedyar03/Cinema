import { telegramMinorMatchesUzs, uzsToTelegramMinor } from "./telegram-amount";

export const INVOICE_PAYLOAD_MAX_BYTES = 128;

export class PaymentRuleError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "PaymentRuleError";
		this.status = status;
		this.code = code;
	}
}

export type InvoiceOrder = {
	id: string;
	userId: string;
	status: string;
	totalUzs: number;
	holdExpiresAt: Date | null;
	telegramId: string | null;
};

export type PreCheckoutInput = {
	orderId: string;
	totalAmount: number;
	currency: string;
	telegramUserId: string;
};

const TZ = "Asia/Tashkent";

export function readInvoicePayload(
	payload: string,
): { ok: true; orderId: string } | { ok: false; errorMessage: string } {
	if (!payload || payload.includes("\0")) {
		return { ok: false, errorMessage: "Некорректные данные счёта" };
	}
	if (Buffer.byteLength(payload, "utf8") > INVOICE_PAYLOAD_MAX_BYTES) {
		return { ok: false, errorMessage: "Некорректные данные счёта" };
	}
	return { ok: true, orderId: payload };
}

export function invoicePayloadForOrder(orderId: string): string {
	const parsed = readInvoicePayload(orderId);
	if (!parsed.ok) {
		throw new PaymentRuleError(422, "PAYLOAD_INVALID", parsed.errorMessage);
	}
	return parsed.orderId;
}

export function assertOrderOwnedByUser(order: InvoiceOrder, userId: string): void {
	if (order.userId !== userId) {
		throw new PaymentRuleError(403, "FORBIDDEN", "Это не ваш заказ");
	}
}

export function assertOrderOwnedByTelegram(order: InvoiceOrder, telegramUserId: string): void {
	if (!order.telegramId || order.telegramId !== telegramUserId) {
		throw new PaymentRuleError(403, "FORBIDDEN", "Заказ недоступен");
	}
}

export function assertHoldActive(order: InvoiceOrder, now: Date): void {
	if (!order.holdExpiresAt || order.holdExpiresAt.getTime() <= now.getTime()) {
		throw new PaymentRuleError(409, "HOLD_EXPIRED", "Время брони истекло");
	}
}

export function assertPendingPayment(order: InvoiceOrder): void {
	if (order.status === "PAID") {
		throw new PaymentRuleError(409, "ALREADY_PAID", "Заказ уже оплачен");
	}
	if (order.status !== "PENDING_PAYMENT") {
		throw new PaymentRuleError(409, "NOT_PAYABLE", "Заказ уже нельзя оплатить");
	}
}

/** Owner + still payable + amount inside Telegram UZS limits. Returns minor units. */
export function assertCanCreateInvoice(
	order: InvoiceOrder | null,
	userId: string,
	now: Date,
): number {
	if (!order) {
		throw new PaymentRuleError(404, "ORDER_NOT_FOUND", "Заказ не найден");
	}
	assertOrderOwnedByUser(order, userId);
	assertPendingPayment(order);
	assertHoldActive(order, now);
	invoicePayloadForOrder(order.id);
	return uzsToTelegramMinor(order.totalUzs);
}

/** pre_checkout_query: order exists, payer owns it, amount matches, hold is alive. */
export function assertPreCheckout(
	order: InvoiceOrder | null,
	input: PreCheckoutInput,
	now: Date,
): void {
	const payload = readInvoicePayload(input.orderId);
	if (!payload.ok) {
		throw new PaymentRuleError(400, "PAYLOAD_INVALID", payload.errorMessage);
	}
	if (!order) {
		throw new PaymentRuleError(404, "ORDER_NOT_FOUND", "Заказ не найден");
	}
	if (order.id !== payload.orderId) {
		throw new PaymentRuleError(404, "ORDER_NOT_FOUND", "Заказ не найден");
	}
	assertOrderOwnedByTelegram(order, input.telegramUserId);
	if (input.currency !== "UZS") {
		throw new PaymentRuleError(409, "CURRENCY_MISMATCH", "Валюта должна быть UZS");
	}
	assertPendingPayment(order);
	assertHoldActive(order, now);
	if (!telegramMinorMatchesUzs(input.totalAmount, order.totalUzs)) {
		throw new PaymentRuleError(409, "AMOUNT_MISMATCH", "Сумма не совпадает с заказом");
	}
	uzsToTelegramMinor(order.totalUzs);
}

export function clipChars(value: string, max: number): string {
	const chars = Array.from(value);
	if (chars.length <= max) return value;
	return chars.slice(0, max).join("");
}

export function buildInvoiceCopy(input: {
	movieTitle: string;
	cinemaName: string;
	startsAt: Date;
	seatLabels: string[];
	gaQuantity: number;
}): { title: string; description: string } {
	const movie = input.movieTitle.trim() || "Фильм";
	const cinema = input.cinemaName.trim() || "Кинотеатр";
	const when = new Intl.DateTimeFormat("ru-RU", {
		timeZone: TZ,
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	}).format(input.startsAt);
	const places =
		input.seatLabels.length > 0
			? `Места: ${input.seatLabels.join(", ")}`
			: input.gaQuantity > 0
				? `Билетов: ${input.gaQuantity}`
				: "Билеты";
	const title = clipChars(movie, 32);
	const description = clipChars(`Фильм «${movie}». ${cinema}. ${when}. ${places}.`, 255);
	return {
		title: title.length > 0 ? title : "Билеты",
		description: description.length > 0 ? description : "Билеты в кино",
	};
}
