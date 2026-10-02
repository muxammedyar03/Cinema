import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpretPreCheckoutResponse } from "../internal-api.js";

describe("interpretPreCheckoutResponse", () => {
	it("passes an ok result through", () => {
		assert.deepEqual(interpretPreCheckoutResponse(200, { ok: true }), { ok: true });
	});

	it("keeps the API Russian error so Telegram can show it", () => {
		assert.deepEqual(
			interpretPreCheckoutResponse(200, { ok: false, errorMessage: "Время брони истекло" }),
			{
				ok: false,
				errorMessage: "Время брони истекло",
			},
		);
	});

	it("answers with a Russian fallback when the API is unreachable or malformed", () => {
		const fallback = interpretPreCheckoutResponse(500, null);
		assert.equal(fallback.ok, false);
		if (!fallback.ok) {
			assert.match(fallback.errorMessage, /Не удалось проверить заказ/);
		}
		assert.equal(interpretPreCheckoutResponse(200, { ok: false }).ok, false);
	});
});
