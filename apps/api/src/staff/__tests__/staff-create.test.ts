import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionUser } from "@cinema/types";
import { ConflictException } from "@nestjs/common";
import { compare } from "bcryptjs";
import type { PrismaService } from "../../prisma/prisma.service";
import { StaffService } from "../staff.service";

const ADMIN: SessionUser = {
	id: "admin",
	email: "admin@example.com",
	firstName: "Админ",
	lastName: "Кино",
	mustChangePassword: false,
	role: "CUSTOMER",
	staff: [
		{
			cinemaId: "c1",
			cinemaName: "Magic",
			cinemaStatus: "ACTIVE",
			role: "CINEMA_ADMIN",
		},
	],
};

describe("StaffService.create", () => {
	it("returns 409 LOGIN_TAKEN when the login already exists", async () => {
		const prisma = {
			cinema: { findUnique: async () => ({ id: "c1" }) },
			user: { findUnique: async () => ({ id: "taken" }) },
		} as unknown as PrismaService;
		const service = new StaffService(prisma);
		await assert.rejects(
			() =>
				service.create(ADMIN, {
					login: "Kassir",
					password: "TempPass123",
					role: "STAFF",
				}),
			(err: unknown) => {
				assert.ok(err instanceof ConflictException);
				const body = err.getResponse() as { statusCode: number; code: string; message: string };
				assert.equal(err.getStatus(), 409);
				assert.equal(body.code, "LOGIN_TAKEN");
				assert.match(body.message, /логин/i);
				return true;
			},
		);
	});

	it("creates a staff account with a hash and mustChangePassword, and omits the secret", async () => {
		let storedHash = "";
		const prisma = {
			cinema: { findUnique: async () => ({ id: "c1" }) },
			user: { findUnique: async () => null },
			$transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
				fn({
					user: {
						create: async ({
							data,
						}: {
							data: { login: string; passwordHash: string; mustChangePassword: boolean };
						}) => {
							storedHash = data.passwordHash;
							assert.equal(data.login, "kassir");
							assert.equal(data.mustChangePassword, true);
							assert.notEqual(data.passwordHash, "TempPass123");
							return { id: "u2" };
						},
					},
					cinemaStaff: {
						create: async () => ({
							id: "s1",
							cinemaId: "c1",
							role: "STAFF" as const,
							active: true,
							createdAt: new Date("2026-09-28T00:00:00.000Z"),
							user: {
								id: "u2",
								login: "kassir",
								email: null,
								firstName: null,
								lastName: null,
								mustChangePassword: true,
							},
						}),
					},
				}),
		} as unknown as PrismaService;
		const service = new StaffService(prisma);
		const created = await service.create(ADMIN, {
			login: "Kassir",
			password: "TempPass123",
			role: "STAFF",
		});
		assert.equal(created.mustChangePassword, true);
		assert.equal(created.login, "kassir");
		assert.equal("passwordHash" in created, false);
		assert.equal(JSON.stringify(created).includes("TempPass123"), false);
		assert.equal(await compare("TempPass123", storedHash), true);
	});
});
