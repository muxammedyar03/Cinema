import type { SessionUser } from "@cinema/types";
import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ALLOW_WHEN_LOCKED_KEY } from "./allow-when-locked.decorator";

/**
 * Blocks cinema staff when their cinema is LOCKED (billing overdue).
 * Super Admin always passes. Routes marked @AllowWhenLocked() also pass.
 */
@Injectable()
export class BillingLockGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const allow = this.reflector.getAllAndOverride<boolean>(ALLOW_WHEN_LOCKED_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (allow) return true;

		const user = context.switchToHttp().getRequest<{ user?: SessionUser }>().user;
		if (!user) return true;
		if (user.role === "SUPER_ADMIN") return true;

		const locked = user.staff.filter((s) => s.cinemaStatus === "LOCKED");
		if (locked.length === 0) return true;

		// If every cinema they belong to is locked → block
		if (locked.length === user.staff.length) {
			throw new ForbiddenException({
				statusCode: 403,
				message: "Subscription overdue — access locked",
				code: "BILLING_LOCKED",
				cinemaId: locked[0]?.cinemaId,
				cinemaName: locked[0]?.cinemaName,
			});
		}
		return true;
	}
}
