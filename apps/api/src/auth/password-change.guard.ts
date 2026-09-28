import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { SESSION_COOKIE } from "./session.guard";

export const ALLOW_PASSWORD_CHANGE_KEY = "allowPasswordChange";

/** Routes a user may call while `mustChangePassword` is true. */
export const AllowDuringPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);

const ALLOWED_ROUTES = new Set([
	"POST /auth/login",
	"POST /auth/logout",
	"GET /auth/me",
	"POST /auth/change-password",
]);

@Injectable()
export class PasswordChangeGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly auth: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request>();
		const path = (req.path || req.url || "").split("?")[0];
		const allowedByPath = ALLOWED_ROUTES.has(`${req.method} ${path}`);
		const allowedByDecorator = this.reflector.getAllAndOverride<boolean>(
			ALLOW_PASSWORD_CHANGE_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (allowedByPath || allowedByDecorator) return true;

		const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
		if (!sid) return true;

		const user = await this.auth.getSessionUser(sid);
		if (!user?.mustChangePassword) return true;

		throw new ForbiddenException({
			statusCode: 403,
			code: "PASSWORD_CHANGE_REQUIRED",
			message: "Сначала смените пароль",
		});
	}
}
