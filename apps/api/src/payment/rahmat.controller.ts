import type { SessionUser } from "@cinema/types";
import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { RahmatService } from "./rahmat.service";
import type { RahmatPurpose } from "./rahmat-client";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
	const result = schema.safeParse(body);
	if (!result.success)
		throw new BadRequestException({ code: "BAD_REQUEST", message: "Некорректные данные платежа" });
	return result.data;
}
const callback = z.object({
	store_id: z.union([z.string(), z.number()]).optional(),
	invoice_id: z.string().min(1).max(128),
	amount: z.number().int().positive(),
	uuid: z.string().uuid(),
	sign: z.string().regex(/^[a-f0-9]{32}$/i),
});
@Controller()
export class RahmatController {
	constructor(private readonly rahmat: RahmatService) {}
	@Post("payments/rahmat/bind")
	@UseGuards(SessionGuard)
	bind(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		return this.rahmat.bind(
			user,
			parse(z.object({ orderId: z.string().min(1).max(128) }), body).orderId,
		);
	}
	@Post("payments/rahmat/create")
	@UseGuards(SessionGuard)
	create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		const data = parse(
			z.object({ orderId: z.string().min(1).max(128), bindingId: z.string().min(1).max(128) }),
			body,
		);
		return this.rahmat.create(user, data.orderId, data.bindingId);
	}
	@Get("payments/:id")
	@UseGuards(SessionGuard)
	get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.rahmat.get(user, id);
	}
	@Get("orders/:id/payment")
	@UseGuards(SessionGuard)
	byOrder(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.rahmat.byOrder(user, id);
	}
	@Post("payments/:id/sync")
	@UseGuards(SessionGuard)
	sync(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.rahmat.sync(user, id);
	}
	@Post("payments/:id/confirm")
	@UseGuards(SessionGuard)
	confirm(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		const data = parse(
			z.object({
				otp: z
					.string()
					.regex(/^\d{4,8}$/)
					.optional(),
			}),
			body,
		);
		return this.rahmat.confirm(user, id, data.otp);
	}
	@Get("admin/billing/my-invoices")
	@UseGuards(SessionGuard)
	subscriptions(@CurrentUser() user: SessionUser) {
		return this.rahmat.mySubscriptions(user);
	}

	@Post("admin/billing/invoices/:id/rahmat")
	@UseGuards(SessionGuard)
	subscription(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.rahmat.subscription(user, id);
	}
	@Post("webhooks/rahmat/:purpose/:mode")
	@HttpCode(200)
	callback(@Param("purpose") purpose: string, @Param("mode") mode: string, @Body() body: unknown) {
		const p = parse(z.enum(["ticket", "subscription"]), purpose);
		const m = parse(z.enum(["success", "events"]), mode);
		return this.rahmat.callback(
			p.toUpperCase() as RahmatPurpose,
			parse(callback, body),
			m === "events",
		);
	}
}
