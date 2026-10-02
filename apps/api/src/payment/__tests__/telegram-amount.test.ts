import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	maxPayableUzs,
	minPayableUzs,
	TELEGRAM_UZS_MAX_MINOR,
	TELEGRAM_UZS_MIN_MINOR,
	TelegramAmountError,
	telegramMinorMatchesUzs,
	uzsToTelegramMinor,
} from "../telegram-amount";

describe("uzsToTelegramMinor", () => {
	it("converts whole sums to minor units (×100)", () => {
		assert.equal(uzsToTelegramMinor(45_000), 4_500_000);
		assert.equal(telegramMinorMatchesUzs(4_500_000, 45_000), true);
		assert.equal(telegramMinorMatchesUzs(4_500_001, 45_000), false);
	});

	it("accepts the Telegram UZS minimum and maximum in whole sums", () => {
		assert.equal(minPayableUzs(), Math.ceil(TELEGRAM_UZS_MIN_MINOR / 100));
		assert.equal(maxPayableUzs(), Math.floor(TELEGRAM_UZS_MAX_MINOR / 100));
		assert.equal(uzsToTelegramMinor(minPayableUzs()), minPayableUzs() * 100);
		assert.ok(uzsToTelegramMinor(minPayableUzs()) >= TELEGRAM_UZS_MIN_MINOR);
		assert.equal(uzsToTelegramMinor(maxPayableUzs()), maxPayableUzs() * 100);
		assert.ok(uzsToTelegramMinor(maxPayableUzs()) <= TELEGRAM_UZS_MAX_MINOR);
	});

	it("rejects one sum below the minimum and one above the maximum", () => {
		assert.throws(
			() => uzsToTelegramMinor(minPayableUzs() - 1),
			(err: unknown) => err instanceof TelegramAmountError && err.code === "AMOUNT_TOO_SMALL",
		);
		assert.throws(
			() => uzsToTelegramMinor(maxPayableUzs() + 1),
			(err: unknown) => err instanceof TelegramAmountError && err.code === "AMOUNT_TOO_LARGE",
		);
	});

	it("rejects fractional, negative, and non-integer amounts", () => {
		for (const value of [10.5, -1, Number.NaN, 1.2]) {
			assert.throws(
				() => uzsToTelegramMinor(value),
				(err: unknown) => err instanceof TelegramAmountError && err.code === "AMOUNT_INVALID",
			);
		}
	});
});
