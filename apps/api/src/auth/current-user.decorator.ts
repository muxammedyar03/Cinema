import type { SessionUser } from "@cinema/types";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): SessionUser => {
		const req = ctx.switchToHttp().getRequest<{ user: SessionUser }>();
		return req.user;
	},
);
