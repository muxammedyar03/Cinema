import type { SessionUser } from "@cinema/types";
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { refundSelection } from "./refund-rules";
export type RefundInput = { ticketIds: string[]; reason?: string; idempotencyKey: string };
@Injectable()
export class RefundService {
	constructor(private readonly prisma: PrismaService) {}
	async request(user: SessionUser, orderId: string, input: RefundInput, staff = false) {
		return this.prisma.$transaction(async (tx) => {
			await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: { session: true, items: true, tickets: true, payments: true, refunds: true },
			});
			if (!order)
				throw new NotFoundException({ code: "ORDER_NOT_FOUND", message: "Заказ не найден" });
			if (
				staff
					? user.role === "SUPER_ADMIN" || !canAccessCinema(user, order.cinemaId)
					: order.userId !== user.id
			)
				throw new ForbiddenException();
			const previous = await tx.refund.findUnique({
				where: { idempotencyKey: input.idempotencyKey },
			});
			if (previous) {
				if (
					previous.orderId !== orderId ||
					previous.initiatedByUserId !== user.id ||
					previous.reason !== (input.reason ?? null) ||
					[...previous.ticketIds].sort().join() !== [...input.ticketIds].sort().join()
				)
					throw new ConflictException({
						code: "IDEMPOTENCY_CONFLICT",
						message: "Повторный запрос с другими данными",
					});
				return this.result(previous);
			}
			if (!staff && order.session.startsAt.getTime() <= Date.now() + 60 * 60000)
				throw new ForbiddenException({
					code: "SELF_REFUND_WINDOW_CLOSED",
					message: "До сеанса меньше часа",
				});
			if (!["PAID", "REFUND_PENDING"].includes(order.status))
				throw new ConflictException({ code: "PAYMENT_NOT_PAID", message: "Заказ не оплачен" });
			const payment = order.payments.find(
				(p) => p.status === "PAID" || p.status === "REFUND_PENDING",
			);
			if (!payment)
				throw new ConflictException({ code: "PAYMENT_NOT_PAID", message: "Оплата не найдена" });
			const amountUzs = refundSelection(order.tickets, order.items, input.ticketIds);
			if (
				order.refunds.some(
					(r) => r.status === "PENDING" && r.ticketIds.some((id) => input.ticketIds.includes(id)),
				)
			)
				throw new ConflictException({
					code: "REFUND_ALREADY_PENDING",
					message: "Возврат этих билетов уже рассматривается",
				});
			const reserved = order.refunds
				.filter((r) => r.paymentId === payment.id && r.status !== "FAILED")
				.reduce((s, r) => s + r.amountUzs, 0);
			if (amountUzs <= 0 || reserved + amountUzs > payment.amountUzs)
				throw new ConflictException({
					code: "REFUND_AMOUNT_EXCEEDED",
					message: "Сумма возврата превышает оплату",
				});
			const refund = await tx.refund.create({
				data: {
					orderId,
					paymentId: payment.id,
					amountUzs,
					ticketIds: input.ticketIds,
					idempotencyKey: input.idempotencyKey,
					reason: input.reason,
					initiatedByUserId: user.id,
				},
			});
			await tx.order.update({ where: { id: orderId }, data: { status: "REFUND_PENDING" } });
			await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUND_PENDING" } });
			return this.result(refund);
		});
	}
	result(refund: { id: string; status: string; amountUzs: number }) {
		return {
			refundId: refund.id,
			status: refund.status,
			amountUzs: refund.amountUzs,
			processingMode: "MANUAL",
			message:
				"Заявка на возврат оформлена. Кинотеатр вернёт деньги через платёжного провайдера; срок зачисления уточнит кинотеатр.",
		};
	}
	async resolve(
		user: SessionUser,
		orderId: string,
		id: string,
		input: { status: "SUCCEEDED" | "FAILED"; reference: string },
	) {
		return this.prisma.$transaction(async (tx) => {
			await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: { session: true, tickets: true },
			});
			if (!order) throw new NotFoundException();
			if (user.role === "SUPER_ADMIN" || !canManageCinema(user, order.cinemaId))
				throw new ForbiddenException();
			const refund = await tx.refund.findFirst({ where: { id, orderId } });
			if (!refund)
				throw new NotFoundException({ code: "REFUND_NOT_FOUND", message: "Заявка не найдена" });
			if (refund.status !== "PENDING") {
				if (refund.status !== input.status || refund.providerRefundId !== input.reference)
					throw new ConflictException("Возврат уже обработан");
				return this.result(refund);
			}
			if (!refund.ticketIds.length)
				throw new ConflictException("Старая заявка требует отдельной проверки");
			if (input.status === "SUCCEEDED") {
				const chosen = order.tickets.filter((t) => refund.ticketIds.includes(t.id));
				if (chosen.length !== refund.ticketIds.length || chosen.some((t) => t.status !== "ACTIVE"))
					throw new ConflictException({
						code: "TICKET_NOT_REFUNDABLE",
						message: "Билет уже использован. Проверьте возврат вручную",
					});
				await tx.ticket.updateMany({
					where: { id: { in: refund.ticketIds }, status: "ACTIVE" },
					data: { status: "REFUNDED" },
				});
				if (order.session.startsAt.getTime() > Date.now() + 30 * 60000)
					await tx.sessionSeat.updateMany({
						where: {
							sessionId: order.sessionId,
							seatId: { in: chosen.flatMap((t) => (t.seatId ? [t.seatId] : [])) },
							status: "SOLD",
						},
						data: { status: "AVAILABLE", orderItemId: null, holdExpiresAt: null },
					});
			}
			const updated = await tx.refund.update({
				where: { id },
				data: {
					status: input.status,
					providerRefundId: input.reference,
					resolvedByUserId: user.id,
					resolvedAt: new Date(),
				},
			});
			const pending = await tx.refund.count({ where: { orderId, status: "PENDING" } });
			const remaining = await tx.ticket.count({
				where: { orderId, status: { in: ["ACTIVE", "USED"] } },
			});
			await tx.order.update({
				where: { id: orderId },
				data: { status: pending ? "REFUND_PENDING" : remaining ? "PAID" : "REFUNDED" },
			});
			const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
			const totals = await tx.refund.aggregate({
				where: { paymentId: payment.id, status: "SUCCEEDED" },
				_sum: { amountUzs: true },
			});
			const paymentPending = await tx.refund.count({
				where: { paymentId: payment.id, status: "PENDING" },
			});
			await tx.payment.update({
				where: { id: payment.id },
				data: {
					status: paymentPending
						? "REFUND_PENDING"
						: totals._sum.amountUzs === payment.amountUzs
							? "REFUNDED"
							: "PAID",
				},
			});
			return this.result(updated);
		});
	}
}
