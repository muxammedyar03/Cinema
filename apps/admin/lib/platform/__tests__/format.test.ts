import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	activeCinemasHint,
	adminStatusView,
	cinemaStatusLabel,
	cinemaStatusTone,
	formatDueDate,
	formatMoneyUzs,
	formatPeriod,
	invoiceStatusLabel,
	personName,
	profileMissingLabel,
	roleLabel,
	showCityColumn,
	unlockRowIds,
} from "../format";

describe("platform format", () => {
	it("formats sums in Russian grouping with the sum currency", () => {
		const text = formatMoneyUzs(2_500_000).replace(/\u00a0/g, " ");
		assert.equal(text, "2 500 000 сум");
	});

	it("formats a billing period and rejects an unknown month", () => {
		assert.equal(formatPeriod(2026, 9), "Сентябрь 2026");
		assert.equal(formatPeriod(2026, 13), "—");
	});

	it("formats a due date in the Tashkent calendar", () => {
		assert.equal(formatDueDate("2026-09-15T19:30:00.000Z"), "16.09.2026");
		assert.equal(formatDueDate("not-a-date"), "—");
	});

	it("pluralizes the active-cinema hint", () => {
		assert.equal(activeCinemasHint(0), "0 активных");
		assert.equal(activeCinemasHint(1), "1 активный");
		assert.equal(activeCinemasHint(2), "2 активных");
		assert.equal(activeCinemasHint(11), "11 активных");
		assert.equal(activeCinemasHint(21), "21 активный");
	});

	it("shows awaiting connection only when profileComplete is false", () => {
		assert.equal(
			cinemaStatusLabel({ status: "ACTIVE", profileComplete: false }),
			"Ожидает подключения",
		);
		assert.equal(cinemaStatusTone({ status: "ACTIVE", profileComplete: false }), "warn");
		assert.equal(cinemaStatusLabel({ status: "ACTIVE", profileComplete: true }), "Активен");
		assert.equal(cinemaStatusLabel({ status: "LOCKED", profileComplete: null }), "Заблокирован");
		assert.equal(cinemaStatusLabel({ status: "DISABLED", profileComplete: true }), "Отключён");
	});

	it("translates invoice statuses and hides unknown codes", () => {
		assert.equal(invoiceStatusLabel("PAID"), "Оплачен");
		assert.equal(invoiceStatusLabel("DUE"), "Ожидает оплаты");
		assert.equal(invoiceStatusLabel("OVERDUE"), "Просрочен");
		assert.equal(invoiceStatusLabel("VOID"), "Аннулирован");
		assert.equal(invoiceStatusLabel("PENDING"), "—");
	});

	it("translates staff roles and person names", () => {
		assert.equal(roleLabel("CINEMA_ADMIN"), "Администратор");
		assert.equal(roleLabel("STAFF"), "Контроль входа");
		assert.equal(roleLabel("OWNER"), "—");
		assert.equal(personName("Алия", "Каримова"), "Алия Каримова");
		assert.equal(personName(null, null), "—");
	});

	it("does not invent an active badge for administrators", () => {
		assert.deepEqual(adminStatusView({ profileComplete: false, billingStatus: "PAID" }), {
			label: "Ожидает подключения",
			tone: "warn",
		});
		assert.deepEqual(adminStatusView({ profileComplete: true, billingStatus: "DUE" }), {
			label: "Ожидает оплаты",
			tone: "warn",
		});
		assert.equal(adminStatusView({ profileComplete: true, billingStatus: null }), null);
		assert.equal(adminStatusView({ profileComplete: null, billingStatus: "NOPE" }), null);
	});

	it("translates profile step keys", () => {
		assert.equal(
			profileMissingLabel(["photos", "securityEmail", "unknown"]),
			"фото, почта для входа",
		);
	});

	it("offers unlock once per locked cinema", () => {
		const ids = unlockRowIds([
			{ id: "a", cinemaId: "c1", cinemaStatus: "LOCKED" },
			{ id: "b", cinemaId: "c1", cinemaStatus: "LOCKED" },
			{ id: "c", cinemaId: "c2", cinemaStatus: "ACTIVE" },
			{ id: "d", cinemaId: "c3", cinemaStatus: "LOCKED" },
		]);
		assert.deepEqual([...ids], ["a", "d"]);
	});

	it("hides the city column until at least one cinema has a city", () => {
		assert.equal(showCityColumn([{ city: null }, { city: "" }]), false);
		assert.equal(showCityColumn([{ city: null }, { city: "Ташкент" }]), true);
	});
});
