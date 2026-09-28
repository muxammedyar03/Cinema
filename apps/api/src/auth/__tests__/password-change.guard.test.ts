import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionUser } from "@cinema/types";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { AuthService } from "../auth.service";
import { PasswordChangeGuard } from "../password-change.guard";

const flagged: SessionUser = {
	id: "u1",
	email: null,
	firstName: "Али",
	lastName: null,
	mustChangePassword: true,
	role: "CUSTOMER",
	staff: [
		{
			cinemaId: "c1",
			cinemaName: "Cinema",
			cinemaStatus: "ACTIVE",
			role: "STAFF",
		},
	],
};

function context(method: string, path: string, sid?: string) {
	return {
		getHandler: () => ({}),
		getClass: () => ({}),
		switchToHttp: () => ({
			getRequest: () => ({
				method,
				path,
				cookies: sid ? { sid } : {},
			}),
		}),
	};
}

function guard(user: SessionUser | null, allowDecorator = false) {
	const reflector = {
		getAllAndOverride: () => allowDecorator,
	} as unknown as Reflector;
	const auth = {
		getSessionUser: async () => user,
	} as unknown as AuthService;
	return new PasswordChangeGuard(reflector, auth);
}

describe("PASSWORD_CHANGE_REQUIRED guard", () => {
	it("blocks other admin routes while the password must be changed", async () => {
		const g = guard(flagged);
		await assert.rejects(
			() => g.canActivate(context("GET", "/admin/movies", "cookie") as never),
			(err: unknown) => {
				assert.ok(err instanceof ForbiddenException);
				const body = err.getResponse() as { statusCode: number; code: string; message: string };
				assert.equal(body.statusCode, 403);
				assert.equal(body.code, "PASSWORD_CHANGE_REQUIRED");
				assert.match(body.message, /парол/i);
				return true;
			},
		);
	});

	it("allows login, me, change-password and logout", async () => {
		const g = guard(flagged);
		assert.equal(await g.canActivate(context("POST", "/auth/login", "cookie") as never), true);
		assert.equal(await g.canActivate(context("GET", "/auth/me", "cookie") as never), true);
		assert.equal(
			await g.canActivate(context("POST", "/auth/change-password", "cookie") as never),
			true,
		);
		assert.equal(await g.canActivate(context("POST", "/auth/logout", "cookie") as never), true);
	});

	it("allows a decorated route and a user who already changed the password", async () => {
		assert.equal(
			await guard(flagged, true).canActivate(context("GET", "/admin/dashboard", "cookie") as never),
			true,
		);
		assert.equal(
			await guard({ ...flagged, mustChangePassword: false }).canActivate(
				context("GET", "/admin/staff", "cookie") as never,
			),
			true,
		);
		assert.equal(await guard(flagged).canActivate(context("GET", "/admin/movies") as never), true);
	});
});
