/**
 * Telegram Bot Payments amounts for UZS.
 * Source: https://core.telegram.org/bots/payments/currencies.json (fetched 2026-10-02)
 * UZS exp = 2, so 1 sum = 100 minor units (tiyin).
 * min_amount = 1298089, max_amount = 12980894361 (minor units).
 */
export const UZS_MINOR_FACTOR = 100;
export const TELEGRAM_UZS_MIN_MINOR = 1_298_089;
export const TELEGRAM_UZS_MAX_MINOR = 12_980_894_361;

export class TelegramAmountError extends Error {
	readonly code: "AMOUNT_INVALID" | "AMOUNT_TOO_SMALL" | "AMOUNT_TOO_LARGE";

	constructor(code: TelegramAmountError["code"], message: string) {
		super(message);
		this.name = "TelegramAmountError";
		this.code = code;
	}
}

export function minPayableUzs(): number {
	return Math.ceil(TELEGRAM_UZS_MIN_MINOR / UZS_MINOR_FACTOR);
}

export function maxPayableUzs(): number {
	return Math.floor(TELEGRAM_UZS_MAX_MINOR / UZS_MINOR_FACTOR);
}

/** Whole sums → Telegram price amount. Rejects values outside the UZS min/max. */
export function uzsToTelegramMinor(amountUzs: number): number {
	if (!Number.isInteger(amountUzs) || amountUzs < 0) {
		throw new TelegramAmountError("AMOUNT_INVALID", "Сумма должна быть целым числом сум");
	}
	const minor = amountUzs * UZS_MINOR_FACTOR;
	assertTelegramMinor(minor);
	return minor;
}

export function assertTelegramMinor(minor: number): void {
	if (!Number.isInteger(minor)) {
		throw new TelegramAmountError("AMOUNT_INVALID", "Сумма должна быть целым числом сум");
	}
	if (minor < TELEGRAM_UZS_MIN_MINOR) {
		throw new TelegramAmountError(
			"AMOUNT_TOO_SMALL",
			`Минимальная сумма для Click — ${minPayableUzs().toLocaleString("ru-RU")} сум`,
		);
	}
	if (minor > TELEGRAM_UZS_MAX_MINOR) {
		throw new TelegramAmountError("AMOUNT_TOO_LARGE", "Сумма заказа больше максимальной для Click");
	}
}

export function telegramMinorMatchesUzs(totalAmount: number, amountUzs: number): boolean {
	if (!Number.isInteger(totalAmount) || !Number.isInteger(amountUzs)) return false;
	return totalAmount === amountUzs * UZS_MINOR_FACTOR;
}
