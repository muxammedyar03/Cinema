import { createHash, timingSafeEqual } from "node:crypto";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

export const INTERNAL_SECRET_HEADER = "x-internal-secret";

@Injectable()
export class InternalSecretGuard implements CanActivate {
	constructor(private readonly config: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const expected = this.config.get<string>("INTERNAL_API_SECRET")?.trim() ?? "";
		if (!expected) {
			throw new UnauthorizedException({
				code: "INTERNAL_SECRET_UNCONFIGURED",
				message: "Внутренний доступ не настроен",
			});
		}
		const req = context.switchToHttp().getRequest<Request>();
		const header = req.header(INTERNAL_SECRET_HEADER) ?? "";
		if (!safeEqual(header, expected)) {
			throw new UnauthorizedException({
				code: "INTERNAL_SECRET_INVALID",
				message: "Нет доступа",
			});
		}
		return true;
	}
}

function safeEqual(left: string, right: string): boolean {
	const a = createHash("sha256").update(left).digest();
	const b = createHash("sha256").update(right).digest();
	return timingSafeEqual(a, b);
}
