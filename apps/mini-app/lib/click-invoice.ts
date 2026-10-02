import type { TelegramInvoiceStatus } from "./telegram";

export type ClickInvoiceOutcome =
	| { kind: "paid" }
	| { kind: "pending" }
	| { kind: "keep"; message: string };

export function clickInvoiceOutcome(status: TelegramInvoiceStatus): ClickInvoiceOutcome {
	if (status === "paid") return { kind: "paid" };
	if (status === "pending") return { kind: "pending" };
	if (status === "cancelled") {
		return {
			kind: "keep",
			message: "Оплата отменена. Заказ можно оплатить, пока бронь активна.",
		};
	}
	return {
		kind: "keep",
		message: "Оплата не прошла. Заказ можно оплатить, пока бронь активна.",
	};
}
