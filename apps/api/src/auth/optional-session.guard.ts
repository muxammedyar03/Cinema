import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { SESSION_COOKIE } from "./session.guard";

/** Attaches `req.user` when a valid session cookie exists; never rejects. */
@Injectable()
export class OptionalSessionGuard implements CanActivate {
	constructor(private readonly auth: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
		const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
		if (!sid) return true;
		const user = await this.auth.getSessionUser(sid);
		if (user) req.user = user;
		return true;
	}
}
