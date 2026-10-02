import type { SessionUser } from "@cinema/types";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { apiError } from "../cinema/profile.util";
import { PrismaService } from "../prisma/prisma.service";
import {
	assertCanCreateInvoice,
	assertPreCheckout,
	buildInvoiceCopy,
	invoicePayloadForOrder,
	PaymentRuleError,
} from "./invoice-rules";
import {
	isUniqueConstraint,
	recordSuccessfulTelegramPayment,
	recoverDuplicateCharge,
	type SuccessfulPaymentInput,
	type SuccessfulPaymentResult,
} from "./successful-payment";
import { TelegramAmountError } from "./telegram-amount";
import { createTelegramInvoiceLink } from "./telegram-invoice-link";

export type PreCheckoutBody = {
	orderId: string;
	totalAmount: number;
	currency: string;
	telegramUserId: string;
};

@Injectable()
export class PaymentService {
	private readonly log = new Logger(PaymentService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
	) {}

	clickEnabled(): boolean {
		return Boolean(this.config.get<string>("TELEGRAM_PAYMENT_PROVIDER_TOKEN")?.trim());
	}

	async createTelegramInvoice(user: SessionUser, orderId: string): Promise<{ url: string }> {
		const providerToken = this.config.get<string>("TELEGRAM_PAYMENT_PROVIDER_TOKEN")?.trim() ?? "";
		const botToken = this.config.get<string>("TELEGRAM_BOT_TOKEN")?.trim() ?? "";
		if (!providerToken || !botToken) {
			apiError(503, "CLICK_UNAVAILABLE", "Оплата через Click недоступна");
		}

		const order = await this.prisma.order.findUnique({
			where: { id: orderId },
			include: {
				user: { select: { telegramId: true } },
				cinema: { select: { name: true } },
				session: {
					include: { movie: { select: { title: true } } },
				},
				items: true,
			},
		});

		const seatIds =
			order?.items.map((item) => item.seatId).filter((id): id is string => Boolean(id)) ?? [];
		const seats =
			seatIds.length > 0
				? await this.prisma.seat.findMany({
						where: { id: { in: seatIds } },
						select: { id: true, rowLabel: true, number: true },
					})
				: [];
		const seatMap = new Map(seats.map((seat) => [seat.id, `${seat.rowLabel}${seat.number}`]));

		try {
			const minor = assertCanCreateInvoice(
				order
					? {
							id: order.id,
							userId: order.userId,
							status: order.status,
							totalUzs: order.totalUzs,
							holdExpiresAt: order.holdExpiresAt,
							telegramId: order.user.telegramId,
						}
					: null,
				user.id,
				new Date(),
			);
			if (!order) {
				apiError(404, "ORDER_NOT_FOUND", "Заказ не найден");
			}
			const copy = buildInvoiceCopy({
				movieTitle: order.session.movie.title,
				cinemaName: order.cinema.name,
				startsAt: order.session.startsAt,
				seatLabels: order.items
					.map((item) => (item.seatId ? seatMap.get(item.seatId) : null))
					.filter((label): label is string => Boolean(label)),
				gaQuantity: order.items
					.filter((item) => item.type === "GENERAL_ADMISSION")
					.reduce((sum, item) => sum + item.quantity, 0),
			});
			const url = await createTelegramInvoiceLink({
				botToken,
				providerToken,
				title: copy.title,
				description: copy.description,
				payload: invoicePayloadForOrder(order.id),
				amountMinor: minor,
			});
			return { url };
		} catch (err) {
			this.rethrowRule(err);
		}
	}

	async preCheckout(
		input: PreCheckoutBody,
	): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
		try {
			const order = await this.prisma.order.findUnique({
				where: { id: input.orderId },
				include: { user: { select: { telegramId: true } } },
			});
			assertPreCheckout(
				order
					? {
							id: order.id,
							userId: order.userId,
							status: order.status,
							totalUzs: order.totalUzs,
							holdExpiresAt: order.holdExpiresAt,
							telegramId: order.user.telegramId,
						}
					: null,
				input,
				new Date(),
			);
			return { ok: true };
		} catch (err) {
			if (err instanceof PaymentRuleError || err instanceof TelegramAmountError) {
				return { ok: false, errorMessage: err.message };
			}
			this.log.error(
				`pre-checkout failed for ${input.orderId}`,
				err instanceof Error ? err.stack : String(err),
			);
			return { ok: false, errorMessage: "Не удалось проверить заказ. Попробуйте ещё раз." };
		}
	}

	async recordSuccessfulPayment(input: SuccessfulPaymentInput): Promise<SuccessfulPaymentResult> {
		try {
			return await this.prisma.$transaction((tx) =>
				recordSuccessfulTelegramPayment(tx, input, new Date()),
			);
		} catch (err) {
			if (isUniqueConstraint(err)) {
				const recovered = await recoverDuplicateCharge(this.prisma, input);
				if (recovered) return recovered;
			}
			this.rethrowRule(err);
		}
	}

	private rethrowRule(err: unknown): never {
		if (err instanceof PaymentRuleError) {
			apiError(err.status, err.code, err.message);
		}
		if (err instanceof TelegramAmountError) {
			apiError(422, err.code, err.message);
		}
		throw err;
	}
}
