import type { SessionUser } from "@cinema/types";
import { Injectable } from "@nestjs/common";
import type { RahmatCheckout } from "@prisma/client";
import { apiError } from "../cinema/profile.util";
import { PrismaService } from "../prisma/prisma.service";
import {
	assertHoldActive,
	assertOrderOwnedByUser,
	assertPendingPayment,
	PaymentRuleError,
} from "./invoice-rules";
import {
	type ProviderInvoice,
	type ProviderPayment,
	RahmatClient,
	type RahmatPurpose,
} from "./rahmat-client";
import { amountTiyin, splitAmounts, verifyRahmatSign } from "./rahmat-rules";
import { isUniqueConstraint, recordSuccessfulTelegramPayment } from "./successful-payment";

@Injectable()
export class RahmatService {
	constructor(
		private readonly db: PrismaService,
		private readonly client: RahmatClient,
	) {}
	private purpose(row: RahmatCheckout): RahmatPurpose {
		return row.orderId ? "TICKET" : "SUBSCRIPTION";
	}
	private async order(user: SessionUser, id: string) {
		const order = await this.db.order.findUnique({
			where: { id },
			include: { items: true, user: true, cinema: { include: { billing: true } } },
		});
		if (!order) apiError(404, "ORDER_NOT_FOUND", "Заказ не найден");
		try {
			assertOrderOwnedByUser({ ...order, telegramId: order.user.telegramId }, user.id);
			assertPendingPayment({ ...order, telegramId: order.user.telegramId });
			assertHoldActive({ ...order, telegramId: order.user.telegramId }, new Date());
		} catch (error) {
			if (error instanceof PaymentRuleError) apiError(error.status, error.code, error.message);
			throw error;
		}
		return order;
	}
	private staff(user: SessionUser, cinemaId: string) {
		if (
			user.role !== "SUPER_ADMIN" &&
			!user.staff.some((s) => s.cinemaId === cinemaId && s.role === "CINEMA_ADMIN")
		)
			apiError(403, "FORBIDDEN", "Нет доступа к оплате кинотеатра");
	}
	private async owned(user: SessionUser, id: string) {
		const row = await this.db.rahmatCheckout.findUnique({ where: { id } });
		if (!row) apiError(404, "PAYMENT_NOT_FOUND", "Платёж не найден");
		if (row.orderId) {
			const order = await this.db.order.findUnique({ where: { id: row.orderId } });
			if (!order || order.userId !== user.id) apiError(403, "FORBIDDEN", "Это не ваш платёж");
		} else {
			const invoice = await this.db.subscriptionInvoice.findUnique({
				where: {
					id:
						row.subscriptionInvoiceId ??
						apiError(409, "PAYMENT_INVALID", "Некорректная ссылка на счёт"),
				},
			});
			if (!invoice) apiError(404, "INVOICE_NOT_FOUND", "Счёт не найден");
			this.staff(user, invoice.cinemaId);
		}
		return row;
	}
	view(row: RahmatCheckout) {
		return {
			paymentId: row.id,
			orderId: row.orderId,
			provider: "RAHMAT",
			status: row.status,
			amountUzs: row.amountTiyin / 100,
			payUrl: row.payUrl,
			deeplinkUrl: row.deeplinkUrl,
			otpRequired: row.otpRequired,
		};
	}
	async get(user: SessionUser, id: string) {
		return this.view(await this.owned(user, id));
	}
	async byOrder(user: SessionUser, id: string) {
		const row = await this.db.rahmatCheckout.findUnique({ where: { orderId: id } });
		if (!row) apiError(404, "PAYMENT_NOT_FOUND", "Платёж ещё не создан");
		return this.get(user, row.id);
	}
	async bind(user: SessionUser, orderId: string) {
		await this.order(user, orderId);
		const data = await this.client.request<{ session_id: string; form_url: string }>(
			"TICKET",
			"POST",
			"/payment/card/bind",
			{
				store_id: Number(this.client.store("TICKET")),
				redirect_url: this.client.returnUrl("TICKET", orderId),
				redirect_decline_url: this.client.returnUrl("TICKET", orderId),
			},
		);
		await this.db.rahmatCardBinding.create({
			data: {
				userId: user.id,
				purpose: "TICKET",
				sessionId: data.session_id,
				expiresAt: new Date(Date.now() + 15 * 60000),
			},
		});
		return { sessionId: data.session_id, formUrl: data.form_url };
	}
	async create(user: SessionUser, orderId: string, bindingId: string) {
		const order = await this.order(user, orderId);
		const existing = await this.db.rahmatCheckout.findUnique({ where: { orderId } });
		if (existing) return this.view(existing);
		const binding = await this.db.rahmatCardBinding.findUnique({ where: { sessionId: bindingId } });
		if (
			!binding ||
			binding.userId !== user.id ||
			binding.purpose !== "TICKET" ||
			binding.expiresAt < new Date()
		)
			apiError(403, "CARD_SESSION_INVALID", "Сессия привязки карты недоступна");
		const card = await this.client.request<{ card_token?: string; status?: string; ps?: string }>(
			"TICKET",
			"GET",
			`/payment/card/bind/${encodeURIComponent(bindingId)}`,
		);
		if (card.status !== "active" || !card.card_token)
			apiError(409, "CARD_NOT_BOUND", "Завершите привязку карты");
		const recipients = JSON.parse(this.client.required("RAHMAT_CINEMA_RECIPIENTS")) as Record<
			string,
			string
		>;
		const seller = recipients[order.cinemaId];
		if (!seller) apiError(503, "RECIPIENT_NOT_CONFIGURED", "Получатель кинотеатра не настроен");
		const settings = await this.db.platformSettings.findUnique({ where: { id: "default" } });
		const count = order.items.reduce(
			(n, item) => n + (item.type === "GENERAL_ADMISSION" ? item.quantity : 1),
			0,
		);
		const commissionUzs =
			(order.cinema.billing?.commissionPerTicketUzs ?? settings?.defaultCommissionUzs ?? 500) *
			count;
		const commission = commissionUzs === 0 ? 0 : amountTiyin(commissionUzs);
		if (!card.ps || !["uzcard", "humo"].includes(card.ps))
			apiError(
				422,
				"CARD_SCHEME_UNSUPPORTED",
				"Для split оплаты используйте Uzcard/Humo; Visa/MasterCard требует отдельной настройки тарифа",
			);

		const amount = amountTiyin(order.totalUzs);
		const split = splitAmounts(
			amount,
			Number(this.client.required("RAHMAT_TICKET_FEE_BPS")),
			commission,
		);
		const platform = this.client.required("RAHMAT_PLATFORM_RECIPIENT");
		const ofd = this.client.fiscal("TICKET", amount, `Билеты ${order.publicNumber}`);
		let row: RahmatCheckout;
		try {
			row = await this.db.rahmatCheckout.create({
				data: {
					orderId,
					userId: user.id,
					storeId: this.client.store("TICKET"),
					amountTiyin: amount,
				},
			});
		} catch (error) {
			if (isUniqueConstraint(error)) return this.byOrder(user, orderId);
			throw error;
		}
		// Never retry POST after a timeout: a debit may have been created remotely.
		const payment = await this.client.request<ProviderPayment>("TICKET", "POST", "/payment", {
			card: { token: card.card_token },
			store_id: Number(row.storeId),
			amount,
			invoice_id: row.id,
			callback_url: this.client.callback("TICKET"),
			ofd,
			split: [
				{
					type: "account",
					recipient: seller,
					amount: split.seller,
					details: `Билеты ${order.publicNumber}`,
				},
				{
					type: "account",
					recipient: platform,
					amount: split.platform,
					details: `Комиссия ${order.publicNumber}`,
				},
			].filter((part) => part.amount > 0),
		});
		await this.db.rahmatCheckout.updateMany({
			where: { id: row.id, status: "CREATING" },
			data: {
				providerUuid: payment.uuid,
				status: "PENDING",
				otpRequired: Boolean(payment.otp_hash),
			},
		});
		await this.applyProvider(row, payment);
		return this.get(user, row.id);
	}
	async confirm(user: SessionUser, id: string, otp?: string) {
		const row = await this.owned(user, id);
		if (!row.orderId || !row.providerUuid)
			apiError(409, "PAYMENT_NOT_READY", "Платёж ещё не готов");
		if (row.status === "PAID") return this.view(row);
		await this.order(user, row.orderId);
		if (row.otpRequired && !otp) apiError(400, "OTP_REQUIRED", "Введите код SMS");
		// Provider handles repeated PUT; local fulfillment is guarded independently.
		const payment = await this.client.request<ProviderPayment>(
			"TICKET",
			"PUT",
			`/payment/${encodeURIComponent(row.providerUuid)}`,
			otp ? { otp } : {},
		);
		await this.applyProvider(row, payment);
		return this.get(user, id);
	}
	async mySubscriptions(user: SessionUser) {
		const ids = user.staff.filter((s) => s.role === "CINEMA_ADMIN").map((s) => s.cinemaId);
		if (!ids.length && user.role !== "SUPER_ADMIN")
			apiError(403, "FORBIDDEN", "Нет доступа к подпискам");
		const invoices = await this.db.subscriptionInvoice.findMany({
			where: user.role === "SUPER_ADMIN" ? {} : { cinemaId: { in: ids } },
			include: { cinema: { select: { name: true } } },
			orderBy: { dueAt: "desc" },
			take: 100,
		});
		return {
			enabled: this.client.enabled("SUBSCRIPTION"),
			invoices: invoices.map((i) => ({
				id: i.id,
				cinemaName: i.cinema.name,
				publicNumber: i.publicNumber,
				amountUzs: i.amountUzs,
				status: i.status,
				dueAt: i.dueAt,
			})),
		};
	}

	async subscription(user: SessionUser, invoiceId: string) {
		const invoice = await this.db.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
		if (!invoice) apiError(404, "INVOICE_NOT_FOUND", "Счёт не найден");
		this.staff(user, invoice.cinemaId);
		if (invoice.status === "PAID" || invoice.status === "VOID")
			apiError(409, "INVOICE_NOT_PAYABLE", "Счёт уже закрыт");
		const existing = await this.db.rahmatCheckout.findUnique({
			where: { subscriptionInvoiceId: invoiceId },
		});
		if (existing) return this.view(existing);
		const amount = amountTiyin(invoice.amountUzs),
			ofd = this.client.fiscal("SUBSCRIPTION", amount, `Подписка ${invoice.publicNumber}`);
		let row: RahmatCheckout;
		try {
			row = await this.db.rahmatCheckout.create({
				data: {
					subscriptionInvoiceId: invoiceId,
					userId: user.id,
					storeId: this.client.store("SUBSCRIPTION"),
					amountTiyin: amount,
				},
			});
		} catch (error) {
			if (isUniqueConstraint(error)) {
				const other = await this.db.rahmatCheckout.findUniqueOrThrow({
					where: { subscriptionInvoiceId: invoiceId },
				});
				return this.view(other);
			}
			throw error;
		}
		const data = await this.client.request<ProviderInvoice>(
			"SUBSCRIPTION",
			"POST",
			"/payment/invoice",
			{
				store_id: row.storeId,
				amount,
				invoice_id: row.id,
				return_url: this.client.returnUrl("SUBSCRIPTION", invoiceId),
				callback_url: this.client.callback("SUBSCRIPTION"),
				ofd,
				lang: "ru",
			},
		);
		await this.db.rahmatCheckout.updateMany({
			where: { id: row.id, status: "CREATING" },
			data: {
				providerUuid: data.uuid,
				payUrl: data.checkout_url,
				deeplinkUrl: data.deeplink,
				status: "PENDING",
			},
		});
		return this.get(user, row.id);
	}
	async sync(user: SessionUser, id: string) {
		const row = await this.owned(user, id);
		if (row.status === "PAID" || row.status === "REFUNDED") return this.view(row);
		if (!row.providerUuid)
			apiError(
				409,
				"RAHMAT_OUTCOME_UNKNOWN",
				"Проверьте неизвестный результат в кабинете Multicard; новый платёж заблокирован",
			);
		if (row.orderId)
			await this.applyProvider(
				row,
				await this.client.request<ProviderPayment>(
					"TICKET",
					"GET",
					`/payment/${encodeURIComponent(row.providerUuid)}`,
				),
			);
		else {
			const invoice = await this.client.request<ProviderInvoice>(
				"SUBSCRIPTION",
				"GET",
				`/payment/invoice/${encodeURIComponent(row.providerUuid)}`,
			);
			if (invoice.payment && typeof invoice.payment === "object")
				await this.applyProvider(row, invoice.payment);
		}
		return this.get(user, id);
	}
	private async applyProvider(row: RahmatCheckout, payment: ProviderPayment) {
		if (
			String(payment.store_id) !== row.storeId ||
			payment.payment_amount !== row.amountTiyin ||
			payment.store_invoice_id !== row.id ||
			(row.orderId && row.providerUuid && payment.uuid !== row.providerUuid)
		)
			apiError(409, "PAYMENT_MISMATCH", "Данные платежа не совпадают");
		if (payment.status === "success") await this.fulfill(row, payment.uuid);
		if (payment.status === "error")
			await this.db.rahmatCheckout.updateMany({
				where: { id: row.id, status: "PENDING" },
				data: { status: "FAILED", otpRequired: false },
			});
		// progress/revert never overwrite fulfilled orders; external reversals require operations reconciliation.
	}
	async callback(
		purpose: RahmatPurpose,
		body: {
			store_id?: string | number;
			invoice_id: string;
			amount: number;
			uuid: string;
			sign: string;
		},
		webhook: boolean,
	) {
		if (!verifyRahmatSign(body, this.client.secret(purpose), webhook))
			apiError(403, "INVALID_SIGNATURE", "Неверная подпись");
		const row = await this.db.rahmatCheckout.findUnique({ where: { id: body.invoice_id } });
		if (
			!row ||
			this.purpose(row) !== purpose ||
			row.amountTiyin !== body.amount ||
			(!webhook && String(body.store_id) !== row.storeId)
		)
			apiError(409, "PAYMENT_MISMATCH", "Платёж не найден или сумма не совпадает");
		// Webhook signature does not cover status/invoice_id: always fetch authoritative state.
		if (webhook)
			await this.applyProvider(
				row,
				await this.client.request<ProviderPayment>(
					purpose,
					"GET",
					`/payment/${encodeURIComponent(body.uuid)}`,
				),
			);
		else {
			// success sign does not cover uuid. Verify the remote identity too; during
			// synchronous success callbacks the provider may still be in billing state.
			const payment = await this.client.request<ProviderPayment>(
				purpose,
				"GET",
				`/payment/${encodeURIComponent(body.uuid)}`,
			);
			if (
				String(payment.store_id) !== row.storeId ||
				payment.store_invoice_id !== row.id ||
				payment.payment_amount !== row.amountTiyin ||
				payment.uuid !== body.uuid ||
				!["billing", "success"].includes(payment.status)
			)
				apiError(409, "PAYMENT_MISMATCH", "Данные платежа не совпадают");
			await this.fulfill(row, body.uuid);
		}
		return { success: true };
	}
	private async fulfill(row: RahmatCheckout, uuid: string) {
		await this.db.$transaction(async (tx) => {
			await tx.$queryRaw`SELECT "id" FROM "RahmatCheckout" WHERE "id" = ${row.id} FOR UPDATE`;
			const current = await tx.rahmatCheckout.findUniqueOrThrow({ where: { id: row.id } });
			if (current.status === "PAID") {
				if (current.orderId) {
					const paid = await tx.payment.findFirst({
						where: { orderId: current.orderId, provider: "RAHMAT", providerPaymentId: uuid },
					});
					if (!paid) apiError(409, "DUPLICATE_CHARGE", "Другой платёж по этому заказу");
				}
				return;
			}
			if (current.orderId) {
				const order = await tx.order.findUniqueOrThrow({ where: { id: current.orderId } });
				if (!order.holdExpiresAt || order.holdExpiresAt <= new Date())
					apiError(409, "HOLD_EXPIRED", "Время брони истекло; платёж отклонён");
				try {
					await recordSuccessfulTelegramPayment(
						tx,
						{
							orderId: current.orderId,
							totalAmount: current.amountTiyin,
							currency: "UZS",
							telegramPaymentChargeId: `rahmat:${uuid}`,
							providerPaymentChargeId: uuid,
							provider: "RAHMAT",
						},
						new Date(),
					);
				} catch (error) {
					if (error instanceof PaymentRuleError) apiError(error.status, error.code, error.message);
					throw error;
				}
			} else {
				const invoice = await tx.subscriptionInvoice.findUniqueOrThrow({
					where: {
						id:
							current.subscriptionInvoiceId ??
							apiError(409, "PAYMENT_INVALID", "Некорректная ссылка на счёт"),
					},
				});
				if (
					amountTiyin(invoice.amountUzs) !== current.amountTiyin ||
					invoice.status === "VOID" ||
					invoice.status === "PAID"
				)
					apiError(409, "INVOICE_NOT_PAYABLE", "Счёт изменён или закрыт");
				await tx.subscriptionInvoice.update({
					where: { id: invoice.id },
					data: { status: "PAID", paidAt: new Date(), lockedAt: null },
				});
				const outstanding = await tx.subscriptionInvoice.count({
					where: {
						cinemaId: invoice.cinemaId,
						id: { not: invoice.id },
						status: { notIn: ["PAID", "VOID"] },
						lockedAt: { not: null },
					},
				});
				if (!outstanding)
					await tx.cinema.updateMany({
						where: { id: invoice.cinemaId, status: "LOCKED" },
						data: { status: "ACTIVE" },
					});
			}
			await tx.rahmatCheckout.update({
				where: { id: current.id },
				data: { status: "PAID", otpRequired: false },
			});
		});
	}
}
