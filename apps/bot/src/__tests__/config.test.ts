import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

describe("miniAppDeepLink", () => {
	let miniAppDeepLink: (startParam?: string) => string;

	before(async () => {
		process.env.TELEGRAM_BOT_USERNAME = "cinema_bot";
		process.env.TELEGRAM_MINI_APP_SHORT_NAME = "app";
		delete process.env.TELEGRAM_MINI_APP_URL;
		delete process.env.MINI_APP_URL;
		const mod = await import("../config.js");
		miniAppDeepLink = mod.miniAppDeepLink;
	});

	it("builds a t.me deep link when no https mini app url is set", () => {
		assert.equal(miniAppDeepLink(), "https://t.me/cinema_bot/app");
		assert.equal(miniAppDeepLink("afisha"), "https://t.me/cinema_bot/app?startapp=afisha");
	});

	it("encodes start params", () => {
		assert.equal(
			miniAppDeepLink("tickets extra"),
			"https://t.me/cinema_bot/app?startapp=tickets%20extra",
		);
	});
});
