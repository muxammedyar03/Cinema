import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { amountTiyin, splitAmounts, verifyRahmatSign } from "../rahmat-rules";

describe("Rahmat monetary rules", () => {
	it("converts UZS exactly and rejects unsafe/database-overflow amounts", () => {
		assert.equal(amountTiyin(45000), 4500000);
		for (const n of [0, -1, Infinity, 30000000, 0.001]) assert.throws(() => amountTiyin(n));
	});
	it("deducts acquiring fee separately from platform commission", () => {
		assert.deepEqual(splitAmounts(10000000, 200, 500000), {
			seller: 9300000,
			platform: 500000,
			provider: 200000,
		});
		assert.deepEqual(splitAmounts(101, 200, 0), { seller: 98, platform: 0, provider: 3 });
		for (const args of [
			[100, 200, 99],
			[100, 10000, 0],
			[100, -1, 0],
			[100, 200, -1],
		])
			assert.throws(() => splitAmounts(args[0] ?? 0, args[1] ?? 0, args[2] ?? 0));
	});
});
describe("Rahmat callback signatures", () => {
	const fields = {
		store_id: 6,
		invoice_id: "checkout1",
		amount: 100000,
		uuid: "3a231be4-25b5-4b64-8b4d-cf6990f5e063",
		sign: "",
	};
	const secret = "test-only-secret";
	it("verifies success callbacks and refuses modified amount/store/invoice or malformed hex", () => {
		const body = {
			...fields,
			sign: createHash("md5").update(`6checkout1100000${secret}`).digest("hex"),
		};
		assert.equal(verifyRahmatSign(body, secret, false), true);
		for (const patch of [
			{ amount: 100001 },
			{ store_id: 7 },
			{ invoice_id: "other" },
			{ sign: "x".repeat(32) },
		])
			assert.equal(verifyRahmatSign({ ...body, ...patch }, secret, false), false);
		assert.equal(verifyRahmatSign(body, "", false), false);
	});
	it("uses a separate signature formula for status webhooks", () => {
		const body = {
			...fields,
			sign: createHash("md5").update(`${fields.uuid}${fields.amount}${secret}`).digest("hex"),
		};
		assert.equal(verifyRahmatSign(body, secret, true), true);
		assert.equal(verifyRahmatSign({ ...body, uuid: "other" }, secret, true), false);
		assert.equal(verifyRahmatSign(body, secret, false), false);
	});
});
