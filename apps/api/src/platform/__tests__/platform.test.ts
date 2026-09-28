import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ROLES_KEY } from "../../auth/roles.decorator";
import type { PrismaService } from "../../prisma/prisma.service";
import { PlatformController } from "../platform.controller";
import { pageById, toPlatformAdmin, toPlatformCinema } from "../platform.map";
import { PlatformService } from "../platform.service";

describe("PlatformService.summary", () => {
	it("returns the five counts the admin app parses", async () => {
		const staffWhere: unknown[] = [];
		const invoiceWhere: unknown[] = [];
		const cinemaWhere: unknown[] = [];
		const prisma = {
			cinema: {
				count: async (args?: { where?: unknown }) => {
					cinemaWhere.push(args?.where ?? null);
					if (!args?.where) return 4;
					const where = args.where as { status?: string };
					if (where.status === "ACTIVE") return 3;
					return 0;
				},
			},
			hall: { count: async () => 9 },
			cinemaStaff: {
				count: async (args: { where: unknown }) => {
					staffWhere.push(args.where);
					return 5;
				},
			},
			subscriptionInvoice: {
				count: async (args: { where: unknown }) => {
					invoiceWhere.push(args.where);
					return 2;
				},
			},
		} as unknown as PrismaService;

		const summary = await new PlatformService(prisma).summary();

		assert.deepEqual(summary, {
			cinemas: 4,
			cinemasActive: 3,
			halls: 9,
			cinemaAdmins: 5,
			invoicesUnpaid: 2,
		});
		assert.deepEqual(Object.keys(summary), [
			"cinemas",
			"cinemasActive",
			"halls",
			"cinemaAdmins",
			"invoicesUnpaid",
		]);
		assert.deepEqual(staffWhere, [{ role: "CINEMA_ADMIN", active: true }]);
		assert.deepEqual(invoiceWhere, [{ status: { in: ["DUE", "OVERDUE"] } }]);
		assert.deepEqual(cinemaWhere, [null, { status: "ACTIVE" }]);
	});
});

describe("platform list mapping", () => {
	it("returns the admin fields the admin app parses, with null for unknowns", () => {
		const admin = toPlatformAdmin({
			id: "staff-1",
			role: "CINEMA_ADMIN",
			active: true,
			user: {
				id: "user-1",
				email: "  ",
				login: null,
				firstName: null,
				lastName: " ",
			},
			cinema: {
				id: "cinema-1",
				name: "Magic",
				city: "",
				status: "ACTIVE",
				profileComplete: false,
				invoices: [],
			},
		});
		assert.deepEqual(admin, {
			userId: "user-1",
			name: null,
			email: null,
			cinemaId: "cinema-1",
			cinemaName: "Magic",
			role: "CINEMA_ADMIN",
			profileComplete: false,
			billingStatus: null,
		});

		const cinema = toPlatformCinema({
			id: "cinema-1",
			name: "Magic",
			city: null,
			status: "LOCKED",
			profileComplete: false,
			_count: { halls: 2, staff: 1 },
			invoices: [],
		});
		assert.equal(cinema.city, null);
		assert.equal(cinema.billingStatus, null);
		assert.equal(cinema.profileComplete, false);
		assert.equal(cinema.status, "LOCKED");
		assert.equal(cinema.halls, 2);
		assert.equal(cinema.cinemaAdmins, 1);
	});

	it("uses the latest invoice status and a cursor when another page exists", () => {
		const cinema = toPlatformCinema({
			id: "cinema-2",
			name: "Park",
			city: "Ташкент",
			status: "ACTIVE",
			profileComplete: true,
			_count: { halls: 1, staff: 1 },
			invoices: [{ status: "OVERDUE" }],
		});
		assert.equal(cinema.billingStatus, "OVERDUE");
		assert.equal(cinema.city, "Ташкент");

		const page = pageById(
			[
				{ id: "a", n: 1 },
				{ id: "b", n: 2 },
			],
			1,
			(row) => row.n,
		);
		assert.deepEqual(page, { items: [1], nextCursor: "a" });

		const last = pageById([{ id: "a", n: 1 }], 1, (row) => row.n);
		assert.deepEqual(last, { items: [1], nextCursor: null });
	});

	it("asks Prisma for one extra row and keeps profileComplete with billing status", async () => {
		let adminQuery: { take?: number; where?: unknown } | undefined;
		const prisma = {
			cinemaStaff: {
				findMany: async (args: { take?: number; where?: unknown }) => {
					adminQuery = args;
					return [
						{
							id: "staff-9",
							role: "STAFF",
							active: false,
							user: {
								id: "user-9",
								email: null,
								login: "kassir",
								firstName: "Али",
								lastName: "Каримов",
							},
							cinema: {
								id: "cinema-9",
								name: "Magic",
								city: null,
								status: "LOCKED",
								profileComplete: false,
								invoices: [{ status: "DUE" }],
							},
						},
					];
				},
			},
		} as unknown as PrismaService;

		const result = await new PlatformService(prisma).listAdmins({ limit: 1 });
		assert.equal(adminQuery?.take, 2);
		assert.equal(result.nextCursor, null);
		assert.deepEqual(result.items[0], {
			userId: "user-9",
			name: "Али Каримов",
			email: null,
			cinemaId: "cinema-9",
			cinemaName: "Magic",
			role: "STAFF",
			profileComplete: false,
			billingStatus: "DUE",
		});
	});
});

describe("PlatformController", () => {
	it("is Super Admin only", () => {
		for (const method of ["summary", "admins", "cinemas"] as const) {
			assert.deepEqual(Reflect.getMetadata(ROLES_KEY, PlatformController.prototype[method]), [
				"SUPER_ADMIN",
			]);
		}
	});

	it("rejects a limit outside 1..100", async () => {
		const controller = new PlatformController({} as PlatformService);
		try {
			await controller.admins(undefined, "0");
			assert.fail("expected validation error");
		} catch (err) {
			assert.ok(err instanceof BadRequestException);
			const body = err.getResponse() as { code: string; message: string };
			assert.equal(body.code, "VALIDATION_ERROR");
			assert.equal(body.message, "Укажите предел от 1 до 100");
		}
	});
});
