import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { compare, hash } from "bcryptjs";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";
import { AuthService } from "../auth.service";

describe("AuthService.changePassword", () => {
	it("rejects the wrong current password and clears the flag after a valid change", async () => {
		const store = {
			passwordHash: await hash("OldPassword1", 10),
			mustChangePassword: true,
		};
		const prisma = {
			user: {
				findUnique: async () => ({ id: "u1", passwordHash: store.passwordHash }),
				update: async ({
					data,
				}: {
					data: { passwordHash: string; mustChangePassword: boolean };
				}) => {
					store.passwordHash = data.passwordHash;
					store.mustChangePassword = data.mustChangePassword;
					return store;
				},
			},
		} as unknown as PrismaService;
		const service = new AuthService(prisma, {} as RedisService, {} as ConfigService);

		await assert.rejects(
			() =>
				service.changePassword("u1", {
					currentPassword: "wrong-pass",
					newPassword: "NewPassword1",
				}),
			(err: unknown) => {
				assert.ok(err instanceof BadRequestException);
				const body = err.getResponse() as { code: string };
				assert.equal(body.code, "INVALID_CURRENT_PASSWORD");
				return true;
			},
		);
		assert.equal(store.mustChangePassword, true);

		const result = await service.changePassword("u1", {
			currentPassword: "OldPassword1",
			newPassword: "NewPassword1",
		});
		assert.deepEqual(result, { ok: true, mustChangePassword: false });
		assert.equal(store.mustChangePassword, false);
		assert.equal(await compare("NewPassword1", store.passwordHash), true);
		assert.equal(await compare("OldPassword1", store.passwordHash), false);
	});

	it("rejects an account without a password", async () => {
		const prisma = {
			user: { findUnique: async () => ({ id: "u1", passwordHash: null }) },
		} as unknown as PrismaService;
		const service = new AuthService(prisma, {} as RedisService, {} as ConfigService);
		await assert.rejects(
			() =>
				service.changePassword("u1", {
					currentPassword: "OldPassword1",
					newPassword: "NewPassword1",
				}),
			(err: unknown) => {
				assert.ok(err instanceof BadRequestException);
				assert.equal((err.getResponse() as { code: string }).code, "NO_PASSWORD");
				return true;
			},
		);
	});
});
