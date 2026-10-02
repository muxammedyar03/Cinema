import type { SessionUser } from "@cinema/types";
import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import { InternalSecretGuard } from "./internal-secret.guard";
import { PaymentService } from "./payment.service";

const preCheckoutSchema = z.object({
	orderId: z.string().min(1).max(128),
	totalAmount: z.number().int().positive(),
	currency: z.string().length(3),
	telegramUserId: z.string().min(1).max(32),
});

const successfulPaymentSchema = z.object({
	orderId: z.string().min(1).max(128),
	totalAmount: z.number().int().positive(),
	currency: z.string().length(3),
	telegramPaymentChargeId: z.string().min(1).max(128),
	providerPaymentChargeId: z.string().min(1).max(128),
	telegramUserId: z.string().min(1).max(32).optional(),
});

@Controller()
export class PaymentController {
	constructor(private readonly payments: PaymentService) {}

	@Get("payments/options")
	@UseGuards(SessionGuard)
	options() {
		return { click: this.payments.clickEnabled() };
	}

	@Post("orders/:id/telegram-invoice")
	@UseGuards(SessionGuard)
	createInvoice(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.payments.createTelegramInvoice(user, id);
	}

	@Post("internal/telegram-payments/pre-checkout")
	@UseGuards(InternalSecretGuard)
	preCheckout(@Body() body: unknown) {
		const parsed = preCheckoutSchema.safeParse(body);
		if (!parsed.success) {
			return { ok: false as const, errorMessage: "Некорректные данные счёта" };
		}
		return this.payments.preCheckout(parsed.data);
	}

	@Post("internal/telegram-payments/successful")
	@UseGuards(InternalSecretGuard)
	successful(@Body() body: unknown) {
		const parsed = successfulPaymentSchema.safeParse(body);
		if (!parsed.success) {
			throw new BadRequestException({ code: "BAD_REQUEST", message: "Некорректный запрос" });
		}
		return this.payments.recordSuccessfulPayment(parsed.data);
	}
}
