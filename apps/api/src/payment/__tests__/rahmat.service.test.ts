import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { SessionUser } from "@cinema/types";
import type { PrismaService } from "../../prisma/prisma.service";
import { RahmatService } from "../rahmat.service";
import type { RahmatClient } from "../rahmat-client";

const user: SessionUser = { id: "u1", email: null, role: "CUSTOMER", staff: [] };
const uuid = "3a231be4-25b5-4b64-8b4d-cf6990f5e063",
	secret = "unit-test-secret";
const checkout = {
	id: "checkout1",
	orderId: "order1",
	subscriptionInvoiceId: null,
	userId: "u1",
	storeId: "6",
	amountTiyin: 100000,
	status: "PENDING",
	providerUuid: uuid,
	otpRequired: false,
	payUrl: null,
	deeplinkUrl: null,
};
const paid = {
	uuid,
	store_id: 6,
	store_invoice_id: "checkout1",
	payment_amount: 100000,
	status: "success",
	otp_hash: null,
};
function setup(owner = "u1") {
	let reads = 0,
		transactions = 0;
	const db = {
		rahmatCheckout: { findUnique: async () => checkout },
		order: { findUnique: async () => ({ userId: owner }) },
		$transaction: async () => {
			transactions++;
		},
	};
	const client = {
		secret: () => secret,
		request: async () => {
			reads++;
			return paid;
		},
	};
	return {
		service: new RahmatService(db as unknown as PrismaService, client as unknown as RahmatClient),
		counts: () => ({ reads, transactions }),
		client,
	};
}
function success() {
	return {
		store_id: 6,
		invoice_id: checkout.id,
		amount: checkout.amountTiyin,
		uuid,
		sign: createHash("md5").update(`6${checkout.id}${checkout.amountTiyin}${secret}`).digest("hex"),
	};
}
describe("Rahmat tenant and callback boundaries", () => {
	it("rejects another customer before calling provider", async () => {
		const c = setup("u2");
		await assert.rejects(() => c.service.sync(user, checkout.id));
		assert.deepEqual(c.counts(), { reads: 0, transactions: 0 });
	});
	it("rejects invalid signatures before fulfillment", async () => {
		const c = setup();
		await assert.rejects(() =>
			c.service.callback("TICKET", { ...success(), sign: "0".repeat(32) }, false),
		);
		assert.deepEqual(c.counts(), { reads: 0, transactions: 0 });
	});
	it("rejects tampered unsigned UUID belonging to another order", async () => {
		const c = setup();
		c.client.request = async () => ({ ...paid, store_invoice_id: "other" });
		await assert.rejects(() => c.service.callback("TICKET", success(), false));
		assert.equal(c.counts().transactions, 0);
	});
	it("rejects wrong kassa purpose", async () => {
		const c = setup();
		await assert.rejects(() => c.service.callback("SUBSCRIPTION", success(), false));
		assert.deepEqual(c.counts(), { reads: 0, transactions: 0 });
	});
	it("verifies provider identity before fulfillment", async () => {
		const c = setup();
		assert.deepEqual(await c.service.callback("TICKET", success(), false), { success: true });
		assert.deepEqual(c.counts(), { reads: 1, transactions: 1 });
	});
	it("uses provider state instead of unsigned webhook status", async () => {
		const c = setup();
		c.client.request = async () => ({ ...paid, status: "progress" });
		const body = {
			...success(),
			sign: createHash("md5").update(`${uuid}${checkout.amountTiyin}${secret}`).digest("hex"),
		};
		await c.service.callback("TICKET", body, true);
		assert.equal(c.counts().transactions, 0);
	});
});
