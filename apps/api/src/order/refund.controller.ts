import type { SessionUser } from "@cinema/types";
import { BadRequestException, Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { RefundService } from "./refund.service";

const requestSchema = z.object({
	ticketIds: z.array(z.string().min(1).max(100)).min(1).max(100),
	reason: z.string().trim().max(500).optional(),
	idempotencyKey: z.string().uuid(),
});
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
	const result = schema.safeParse(body);
	if (!result.success)
		throw new BadRequestException({
			code: "REFUND_SELECTION_REQUIRED",
			message: "Выберите билеты и повторите запрос",
		});
	return result.data;
}
@Controller("orders")
@UseGuards(SessionGuard)
export class CustomerRefundController {
	constructor(private readonly refunds: RefundService) {}
	@Post(":id/refunds") request(
		@CurrentUser() user: SessionUser,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return this.refunds.request(user, id, parse(requestSchema, body));
	}
}
@Controller("admin/orders")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class AdminRefundController {
	constructor(private readonly refunds: RefundService) {}
	@Post(":id/refunds") @Roles("CINEMA_ADMIN", "STAFF") request(
		@CurrentUser() user: SessionUser,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return this.refunds.request(user, id, parse(requestSchema, body), true);
	}
	@Post(":orderId/refunds/:id/resolve") @Roles("CINEMA_ADMIN") resolve(
		@CurrentUser() user: SessionUser,
		@Param("orderId") orderId: string,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return this.refunds.resolve(
			user,
			orderId,
			id,
			parse(
				z.object({
					status: z.enum(["SUCCEEDED", "FAILED"]),
					reference: z.string().trim().min(3).max(200),
				}),
				body,
			),
		);
	}
}
