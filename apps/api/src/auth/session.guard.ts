import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";

export const SESSION_COOKIE = "sid";

@Injectable()
export class SessionGuard implements CanActivate {
	constructor(private readonly auth: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
		const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
		if (sid) {
			const user = await this.auth.getSessionUser(sid);
			if (user) {
				req.user = user;
				return true;
			}
		}

		const initData = req.header("x-telegram-init-data")?.trim();
		if (initData) {
			req.user = await this.auth.sessionFromInitData(initData);
			return true;
		}

		throw new UnauthorizedException("Not authenticated");
	}
}
