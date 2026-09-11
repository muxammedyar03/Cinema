import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	signTelegramInitData,
	TelegramInitDataError,
	verifyTelegramInitData,
} from "../telegram-init-data";

const TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

describe("verifyTelegramInitData", () => {
	it("accepts a valid signed payload", () => {
		const now = Math.floor(Date.now() / 1000);
		const user = JSON.stringify({ id: 42, first_name: "Ada", username: "ada" });
		const initData = signTelegramInitData({ auth_date: String(now), user, query_id: "AAE" }, TOKEN);
		const parsed = verifyTelegramInitData(initData, TOKEN, 86_400, now);
		assert.equal(parsed.id, 42);
		assert.equal(parsed.username, "ada");
	});

	it("rejects tampered hash", () => {
		const now = Math.floor(Date.now() / 1000);
		const user = JSON.stringify({ id: 1, first_name: "X" });
		let initData = signTelegramInitData({ auth_date: String(now), user }, TOKEN);
		initData = initData.replace(/hash=[0-9a-f]+/, "hash=deadbeef");
		assert.throws(
			() => verifyTelegramInitData(initData, TOKEN, 86_400, now),
			(err: unknown) => err instanceof TelegramInitDataError && err.code === "INIT_DATA_INVALID",
		);
	});

	it("rejects expired auth_date", () => {
		const now = Math.floor(Date.now() / 1000);
		const user = JSON.stringify({ id: 1, first_name: "X" });
		const initData = signTelegramInitData({ auth_date: String(now - 200_000), user }, TOKEN);
		assert.throws(
			() => verifyTelegramInitData(initData, TOKEN, 86_400, now),
			(err: unknown) => err instanceof TelegramInitDataError && err.code === "INIT_DATA_EXPIRED",
		);
	});

	it("rejects missing user", () => {
		const now = Math.floor(Date.now() / 1000);
		const initData = signTelegramInitData({ auth_date: String(now) }, TOKEN);
		assert.throws(
			() => verifyTelegramInitData(initData, TOKEN, 86_400, now),
			(err: unknown) => err instanceof TelegramInitDataError && err.code === "USER_MISSING",
		);
	});

	it("header-style body precedence is a controller concern; empty throws REQUIRED", () => {
		assert.throws(
			() => verifyTelegramInitData("", TOKEN),
			(err: unknown) => err instanceof TelegramInitDataError && err.code === "INIT_DATA_REQUIRED",
		);
	});
});
