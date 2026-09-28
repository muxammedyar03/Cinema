import type { SessionUser } from "@cinema/types";
import { changePasswordSchema, loginSchema } from "@cinema/validation";
import { Body, Controller, Get, Headers, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { parseBody } from "../common/parse-body";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { AllowDuringPasswordChange } from "./password-change.guard";
import { SESSION_COOKIE, SessionGuard } from "./session.guard";

@Controller("auth")
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post("login")
	@AllowDuringPasswordChange()
	async login(
		@Body() body: unknown,
		@Res({ passthrough: true }) res: Response,
	): Promise<{ user: SessionUser }> {
		const parsed = loginSchema.parse(body);
		const { sid, user } = await this.auth.login({
			email: parsed.email,
			login: parsed.login,
			password: parsed.password,
		});
		this.setSessionCookie(res, sid);
		return { user };
	}

	@Post("change-password")
	@AllowDuringPasswordChange()
	@UseGuards(SessionGuard)
	async changePassword(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		const parsed = parseBody(changePasswordSchema, body);
		return this.auth.changePassword(user.id, parsed);
	}

	@Post("logout")
	@AllowDuringPasswordChange()
	async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
		await this.auth.logout(sid);
		res.clearCookie(SESSION_COOKIE, { path: "/" });
		return { ok: true };
	}

	@Get("me")
	@AllowDuringPasswordChange()
	@UseGuards(SessionGuard)
	me(@CurrentUser() user: SessionUser) {
		return { user };
	}

	@Post("telegram")
	async telegram(
		@Headers("x-telegram-init-data") headerInitData: string | undefined,
		@Body() body: { initData?: string },
		@Res({ passthrough: true }) res: Response,
	) {
		const fromHeader = headerInitData?.trim();
		const initData = fromHeader || body?.initData;
		const { sid, user, stub } = await this.auth.telegramAuth(initData);
		this.setSessionCookie(res, sid);
		return { user, stub };
	}

	private setSessionCookie(res: Response, sid: string) {
		res.cookie(SESSION_COOKIE, sid, {
			httpOnly: true,
			sameSite: "lax",
			secure: false,
			path: "/",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
	}
}
