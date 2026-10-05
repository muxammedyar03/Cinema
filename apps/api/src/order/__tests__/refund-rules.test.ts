import assert from "node:assert/strict";
import { test } from "node:test";
import { refundSelection } from "../refund-rules";

const tickets = [
	{ id: "a", status: "ACTIVE", seatId: "s1", type: "SEAT" },
	{ id: "b", status: "ACTIVE", seatId: "s2", type: "SEAT" },
	{ id: "g", status: "ACTIVE", seatId: null, type: "GENERAL_ADMISSION" },
];
const items = [
	{ seatId: "s1", type: "SEAT", unitPriceUzs: 45000 },
	{ seatId: "s2", type: "SEAT", unitPriceUzs: 60000 },
	{ seatId: null, type: "GENERAL_ADMISSION", unitPriceUzs: 30000 },
];
test("partial refund uses the selected ticket price snapshot", () =>
	assert.equal(refundSelection(tickets, items, ["b"]), 60000));
test("multiple and GA tickets preserve their individual values", () =>
	assert.equal(refundSelection(tickets, items, ["a", "g"]), 75000));
test("empty selection cannot silently refund all tickets", () =>
	assert.throws(() => refundSelection(tickets, items, [])));
test("duplicate, foreign and used tickets are rejected", () => {
	for (const ids of [["a", "a"], ["foreign"]])
		assert.throws(() => refundSelection(tickets, items, ids));
	assert.throws(() => refundSelection([{ ...tickets[0], status: "USED" }], items, ["a"]));
});
