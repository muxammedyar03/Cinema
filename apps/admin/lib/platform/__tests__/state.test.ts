import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyExistingEndpoint, classifyNewEndpoint } from "../state";

const parseCount = (body: unknown) =>
	body && typeof body === "object" && "cinemas" in body && typeof body.cinemas === "number"
		? { cinemas: body.cinemas }
		: null;

describe("platform load states", () => {
	it("keeps a missing KAN-37 route on the empty state", () => {
		assert.equal(
			classifyNewEndpoint({ status: 404, body: null }, parseCount, "ошибка").status,
			"unavailable",
		);
		assert.equal(
			classifyNewEndpoint({ status: 200, body: { other: true } }, parseCount, "ошибка").status,
			"unavailable",
		);
	});

	it("shows real summary numbers only when the contract matches", () => {
		const state = classifyNewEndpoint({ status: 200, body: { cinemas: 3 } }, parseCount, "ошибка");
		assert.deepEqual(state, { status: "ready", data: { cinemas: 3 } });
	});

	it("reports transport and server failures in Russian without a stand-in value", () => {
		assert.deepEqual(classifyNewEndpoint({ status: 0, body: null }, parseCount, "Сводка"), {
			status: "error",
			message: "Не удалось связаться с сервером",
		});
		assert.deepEqual(classifyNewEndpoint({ status: 500, body: null }, parseCount, "Сводка"), {
			status: "error",
			message: "Сводка",
		});
	});

	it("treats a broken existing list as an error, not an empty success", () => {
		const state = classifyExistingEndpoint(
			{ status: 200, body: { nope: true } },
			parseCount,
			"Список",
		);
		assert.deepEqual(state, { status: "error", message: "Список" });
		assert.equal(
			classifyExistingEndpoint({ status: 200, body: { cinemas: 1 } }, parseCount, "Список").status,
			"ready",
		);
	});
});
