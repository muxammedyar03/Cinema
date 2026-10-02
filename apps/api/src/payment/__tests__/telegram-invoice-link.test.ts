import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTelegramInvoiceLink } from "../telegram-invoice-link";

describe("createTelegramInvoiceLink", () => {
	it("sends UZS prices in minor units and the order id as payload", async () => {
		let captured: { url: string; body: Record<string, unknown> } | null = null;
		const url = await createTelegramInvoiceLink(
			{
				botToken: "123:bot",
				providerToken: "click-test-token",
				title: "Интерстеллар",
				description: "Фильм «Интерстеллар». Зал. Места: A1.",
				payload: "ord_1",
				amountMinor: 4_500_000,
			},
			(async (input, init) => {
				captured = {
					url: String(input),
					body: JSON.parse(String(init?.body)) as Record<string, unknown>,
				};
				return new Response(JSON.stringify({ ok: true, result: "https://t.me/invoice/abc" }), {
					status: 200,
				});
			}) as typeof fetch,
		);

		assert.equal(url, "https://t.me/invoice/abc");
		assert.ok(captured);
		const sent = captured as { url: string; body: Record<string, unknown> };
		assert.match(sent.url, /\/bot123:bot\/createInvoiceLink$/);
		assert.equal(sent.body.currency, "UZS");
		assert.equal(sent.body.payload, "ord_1");
		assert.equal(sent.body.provider_token, "click-test-token");
		assert.deepEqual(sent.body.prices, [{ label: "Билеты", amount: 4_500_000 }]);
	});
});
