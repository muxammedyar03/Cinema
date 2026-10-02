import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clickInvoiceOutcome } from "../click-invoice";

describe("clickInvoiceOutcome", () => {
	it("sends a paid invoice to the ticket page", () => {
		assert.deepEqual(clickInvoiceOutcome("paid"), { kind: "paid" });
	});

	it("keeps the order payable with a Russian message when the user cancels or the payment fails", () => {
		const cancelled = clickInvoiceOutcome("cancelled");
		const failed = clickInvoiceOutcome("failed");
		assert.equal(cancelled.kind, "keep");
		assert.equal(failed.kind, "keep");
		if (cancelled.kind === "keep") assert.match(cancelled.message, /отменена/);
		if (failed.kind === "keep") assert.match(failed.message, /не прошла/);
	});
});
