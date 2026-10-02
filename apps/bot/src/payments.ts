import type { Bot } from "grammy";
import { createPaymentClient, PaymentApiError } from "./internal-api.js";

type PaymentClient = ReturnType<typeof createPaymentClient>;

const CHECKOUT_FALLBACK = "Не удалось проверить заказ. Попробуйте ещё раз.";

export function registerPaymentHandlers(
	bot: Bot,
	client: PaymentClient = createPaymentClient(),
): void {
	bot.on("pre_checkout_query", async (ctx) => {
		const query = ctx.preCheckoutQuery;
		try {
			const result = await client.preCheckout({
				orderId: query.invoice_payload,
				totalAmount: query.total_amount,
				currency: query.currency,
				telegramUserId: String(query.from.id),
			});
			if (result.ok) {
				await ctx.answerPreCheckoutQuery(true);
				return;
			}
			console.error("pre_checkout rejected", result.errorMessage);
			await ctx.answerPreCheckoutQuery(false, {
				error_message: result.errorMessage || CHECKOUT_FALLBACK,
			});
		} catch (err) {
			console.error("pre_checkout_query failed", err);
			await ctx.answerPreCheckoutQuery(false, { error_message: CHECKOUT_FALLBACK });
		}
	});

	bot.on("message:successful_payment", async (ctx) => {
		const payment = ctx.message.successful_payment;
		const input = {
			orderId: payment.invoice_payload,
			totalAmount: payment.total_amount,
			currency: payment.currency,
			telegramUserId: String(ctx.from?.id ?? ""),
			telegramPaymentChargeId: payment.telegram_payment_charge_id,
			providerPaymentChargeId: payment.provider_payment_charge_id,
		};
		let lastError: unknown;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				await client.successfulPayment(input);
				await ctx.reply("Оплата получена. Билеты в разделе «Мои билеты».");
				return;
			} catch (err) {
				if (err instanceof PaymentApiError && err.status < 500) {
					await ctx.reply(err.message);
					return;
				}
				lastError = err;
			}
		}
		console.error("successful_payment was not applied", lastError);
		await ctx.reply(
			"Оплата получена, но билеты ещё оформляются. Откройте «Мои билеты» через минуту.",
		);
	});
}
