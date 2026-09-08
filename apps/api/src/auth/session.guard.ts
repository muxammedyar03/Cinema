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
		if (!sid) {
			throw new UnauthorizedException("Not authenticated");
		}
		const user = await this.auth.getSessionUser(sid);
		if (!user) {
			throw new UnauthorizedException("Session expired");
		}
		req.user = user;
		return true;
	}
}
