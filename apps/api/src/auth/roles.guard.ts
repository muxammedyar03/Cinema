import type { AdminRole, SessionUser } from "@cinema/types";
import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!required || required.length === 0) {
			return true;
		}
		const user = context.switchToHttp().getRequest<{ user: SessionUser }>().user;
		const roles = effectiveRoles(user);
		if (!required.some((r) => roles.includes(r))) {
			throw new ForbiddenException("Insufficient role");
		}
		return true;
	}
}

export function effectiveRoles(user: SessionUser): AdminRole[] {
	const roles = new Set<AdminRole>();
	if (user.role === "SUPER_ADMIN") {
		roles.add("SUPER_ADMIN");
	}
	for (const s of user.staff) {
		roles.add(s.role);
	}
	return [...roles];
}

export function canAccessCinema(user: SessionUser, cinemaId: string): boolean {
	if (user.role === "SUPER_ADMIN") {
		return true;
	}
	return user.staff.some((s) => s.cinemaId === cinemaId);
}

export function canManageCinema(user: SessionUser, cinemaId: string): boolean {
	if (user.role === "SUPER_ADMIN") {
		return true;
	}
	return user.staff.some((s) => s.cinemaId === cinemaId && s.role === "CINEMA_ADMIN");
}
