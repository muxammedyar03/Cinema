import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	parseCinemaDossier,
	parseCinemaList,
	parseInvoiceList,
	parsePlatformAdmins,
	parsePlatformSummary,
	parseProfileBanner,
} from "../parse";

describe("platform parsers", () => {
	it("accepts the platform summary contract", () => {
		assert.deepEqual(
			parsePlatformSummary({
				cinemas: 3,
				cinemasActive: 2,
				halls: 7,
				cinemaAdmins: 4,
				invoicesUnpaid: 1,
			}),
			{ cinemas: 3, cinemasActive: 2, halls: 7, cinemaAdmins: 4, invoicesUnpaid: 1 },
		);
	});

	it("rejects a summary that is missing a count", () => {
		assert.equal(parsePlatformSummary({ cinemas: 1, halls: 2 }), null);
		assert.equal(
			parsePlatformSummary({
				cinemas: -1,
				cinemasActive: 0,
				halls: 0,
				cinemaAdmins: 0,
				invoicesUnpaid: 0,
			}),
			null,
		);
	});

	it("reads cinemas, optional city, profileComplete and the latest invoice", () => {
		const rows = parseCinemaList([
			{
				id: "c1",
				name: "Magic Cinema",
				status: "ACTIVE",
				address: "ул. Бабура",
				profileComplete: false,
				timezone: "Asia/Tashkent",
				billing: { monthlyPlanUzs: 2_500_000 },
				_count: { halls: 2, staff: 3 },
				invoices: [{ status: "DUE" }],
			},
			{ id: "skip", name: "", status: "ACTIVE" },
		]);
		assert.equal(rows?.length, 1);
		assert.equal(rows?.[0]?.profileComplete, false);
		assert.equal(rows?.[0]?.city, null);
		assert.equal(rows?.[0]?.halls, 2);
		assert.equal(rows?.[0]?.billingStatus, "DUE");
		assert.equal(rows?.[0]?.monthlyPlanUzs, 2_500_000);
	});

	it("prefers an explicit billingStatus and city from KAN-37", () => {
		const rows = parseCinemaList([
			{
				id: "c1",
				name: "Star",
				status: "ACTIVE",
				city: "Ташкент",
				profileComplete: true,
				billingStatus: "OVERDUE",
				invoices: [{ status: "PAID" }],
			},
		]);
		assert.equal(rows?.[0]?.city, "Ташкент");
		assert.equal(rows?.[0]?.billingStatus, "OVERDUE");
	});

	it("reads administrators from an array or a cursor page", () => {
		const page = parsePlatformAdmins({
			items: [
				{
					userId: "u1",
					email: "a@cinema.local",
					cinemaId: "c1",
					cinemaName: "Magic",
					role: "CINEMA_ADMIN",
					firstName: "Алия",
					lastName: "К.",
					profileComplete: false,
				},
			],
			nextCursor: "cursor-2",
		});
		assert.equal(page?.items[0]?.name, "Алия К.");
		assert.equal(page?.items[0]?.profileComplete, false);
		assert.equal(page?.nextCursor, "cursor-2");
		assert.equal(
			parsePlatformAdmins([{ userId: "u", cinemaId: "c", cinemaName: "N", name: "Имя" }])?.items
				.length,
			1,
		);
	});

	it("rejects an administrators payload that is not the contract", () => {
		assert.equal(parsePlatformAdmins({ hello: "world" }), null);
		assert.equal(parsePlatformAdmins([{ email: "only" }]), null);
	});

	it("parses invoices and a dossier without customer payment totals", () => {
		const invoices = parseInvoiceList([
			{
				id: "i1",
				publicNumber: "INV-0091",
				cinemaId: "c1",
				cinemaName: "Magic",
				cinemaStatus: "LOCKED",
				periodYear: 2026,
				periodMonth: 9,
				amountUzs: 2_500_000,
				status: "OVERDUE",
				dueAt: "2026-09-10T00:00:00.000Z",
				paidAt: null,
				daysLate: 4,
			},
		]);
		assert.equal(invoices?.[0]?.publicNumber, "INV-0091");
		assert.equal(invoices?.[0]?.daysLate, 4);

		const dossier = parseCinemaDossier({
			id: "c1",
			name: "Magic",
			status: "ACTIVE",
			timezone: "Asia/Tashkent",
			billing: {
				monthlyPlanUzs: 2_500_000,
				commissionPerTicketUzs: 500,
				commissionIsOverride: false,
				defaultCommissionUzs: 500,
				lockAfterDays: 7,
			},
			admins: [
				{
					staffId: "s1",
					role: "CINEMA_ADMIN",
					email: "a@cinema.local",
					firstName: "Алия",
					lastName: null,
				},
			],
			invoices: [
				{
					id: "i1",
					publicNumber: "INV-1",
					periodYear: 2026,
					periodMonth: 9,
					amountUzs: 1000,
					status: "DUE",
					dueAt: "2026-09-10T00:00:00.000Z",
					paidAt: null,
					daysLate: 1,
				},
			],
			currentInvoice: {
				id: "i1",
				publicNumber: "INV-1",
				status: "DUE",
				amountUzs: 1000,
				daysLate: 1,
			},
			stats: {
				halls: 2,
				ordersToday: 3,
				ordersTotal: 10,
				activeSessions: 1,
				paidInvoices: 4,
				openInvoices: 1,
			},
		});
		assert.equal(dossier?.admins[0]?.email, "a@cinema.local");
		assert.equal(dossier?.invoices[0]?.publicNumber, "INV-1");
		assert.equal(dossier?.stats.ordersTotal, 10);
		assert.equal("revenue" in (dossier?.stats ?? {}), false);
	});

	it("reads the profile banner", () => {
		assert.deepEqual(
			parseProfileBanner({ profileCompletion: { profileComplete: false, missing: ["photos"] } }),
			{ profileComplete: false, missing: ["photos"] },
		);
		assert.equal(parseProfileBanner({ name: "Magic" }), null);
	});
});
