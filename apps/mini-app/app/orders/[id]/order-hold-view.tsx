"use client";

import { Badge, EmptyState } from "@cinema/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClickCheckout } from "../../../components/click-checkout";
import { LinkButton } from "../../../components/link-button";
import { RahmatCheckout } from "../../../components/rahmat-checkout";
import { SelfRefundPanel } from "../../../components/self-refund";
import { TicketQr } from "../../../components/ticket-qr";
import { clientApi, ensureTelegramSession } from "../../../lib/api";
import { errorText } from "../../../lib/api-error";
import { formatCountdown, formatPrice, formatSessionDate, formatTime } from "../../../lib/format";
import type { OrderDetail, OrderTicket } from "../../../lib/types";

function statusLabel(status: string) {
	switch (status) {
		case "PENDING_PAYMENT":
			return "Ожидает оплаты";
		case "PAID":
			return "Оплачен";
		case "EXPIRED":
			return "Истёк";
		case "CANCELLED":
			return "Отменён";
		case "REFUND_PENDING":
			return "Возврат";
		case "REFUNDED":
			return "Возвращён";
		default:
			return status;
	}
}

function statusTone(status: string): "ok" | "warn" | "bad" | "neutral" {
	if (status === "PAID") return "ok";
	if (status === "PENDING_PAYMENT" || status === "REFUND_PENDING") return "warn";
	if (status === "REFUNDED" || status === "CANCELLED" || status === "EXPIRED") return "bad";
	return "neutral";
}

function ticketSeatLabel(order: OrderDetail, ticket: OrderTicket, index: number): string {
	if (ticket.seatLabel) return ticket.seatLabel;
	const seats = order.items.map((item) => item.seatLabel).filter(Boolean) as string[];
	if (ticket.type === "SEAT" && seats[index]) return seats[index];
	if (
		ticket.type === "GENERAL_ADMISSION" ||
		order.items.some((item) => item.type === "GENERAL_ADMISSION")
	) {
		return `Входной билет ${index + 1}`;
	}
	return `Билет ${index + 1}`;
}

export function OrderHoldView({ orderId }: { orderId: string }) {
	const searchParams = useSearchParams();
	const payReturn = searchParams.get("pay") ?? searchParams.get("status");
	const [order, setOrder] = useState<OrderDetail | null>(null);
	const [error, setError] = useState("");
	const [now, setNow] = useState(() => Date.now());
	const [method, setMethod] = useState("click");
	const [rahmatEnabled, setRahmatEnabled] = useState(false);
	const [clickEnabled, setClickEnabled] = useState(false);

	const load = useCallback(async () => {
		const data = await clientApi<OrderDetail>(`/bookings/orders/${orderId}`);
		setOrder(data);
		return data;
	}, [orderId]);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				await ensureTelegramSession();
				if (cancelled) return;
				await load();
				const options = await clientApi<{ click?: boolean; rahmat?: boolean }>(
					"/payments/options",
				).catch(() => null);
				if (!cancelled) {
					setClickEnabled(options?.click === true);
					setRahmatEnabled(options?.rahmat === true);
					setMethod(options?.click ? "click" : "rahmat");
				}
			} catch (err) {
				if (!cancelled) setError(errorText(err, "Заказ не найден"));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [load]);

	useEffect(() => {
		if (!order?.holdExpiresAt || order.status !== "PENDING_PAYMENT") return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [order?.holdExpiresAt, order?.status]);

	const tickets = useMemo(() => order?.tickets ?? [], [order]);

	if (error) {
		return (
			<EmptyState
				title="Заказ не найден"
				description={error}
				action={<LinkButton href="/">На афишу</LinkButton>}
			/>
		);
	}

	if (!order) {
		return <p className="note">Загрузка…</p>;
	}

	const paid = order.status === "PAID" || order.status === "REFUND_PENDING";
	const refunded = order.status === "REFUNDED";
	const holdLeft = order.holdExpiresAt ? new Date(order.holdExpiresAt).getTime() - now : 0;
	const seats = order.items
		.map((item) => item.seatLabel)
		.filter(Boolean)
		.join(" · ");
	const gaQty = order.items
		.filter((item) => item.type === "GENERAL_ADMISSION")
		.reduce((count, item) => count + item.quantity, 0);
	const placesLabel = seats || (gaQty > 0 ? `${gaQty} бил.` : "—");
	const pending = order.status === "PENDING_PAYMENT";
	const expired = order.status === "EXPIRED" || (pending && holdLeft <= 0);
	const showQr = (paid || refunded) && tickets.length > 0;
	const shownStatus = expired && pending ? "Истёк" : statusLabel(order.status);

	return (
		<>
			{pending || expired ? (
				<div className="payment-summary">
					<h1>{order.session.movie.title}</h1>
					<p>
						{formatSessionDate(order.session.startsAt)} · {formatTime(order.session.startsAt)} ·{" "}
						{order.session.hall.name}
					</p>
					<p>
						{order.cinema.name} · Места: {placesLabel}
					</p>
					<b>{formatPrice(order.totalUzs)}</b>
				</div>
			) : (
				<article className="ticket">
					<div className="ticket-top">
						<Badge tone={statusTone(expired && pending ? "EXPIRED" : order.status)}>
							{shownStatus}
						</Badge>
						<h2>{order.session.movie.title}</h2>
						<p>
							{order.cinema.name} · #{order.publicNumber}
						</p>
						<div className="ticket-info">
							<div>
								<span>Дата</span>
								<b>{formatSessionDate(order.session.startsAt)}</b>
							</div>
							<div>
								<span>Время</span>
								<b>{formatTime(order.session.startsAt)}</b>
							</div>
							<div>
								<span>Зал</span>
								<b>{order.session.hall.name}</b>
							</div>
							<div>
								<span>{gaQty > 0 ? "Билеты" : "Места"}</span>
								<b>{placesLabel}</b>
							</div>
							<div>
								<span>Сумма</span>
								<b>{formatPrice(order.totalUzs)}</b>
							</div>
							<div>
								<span>Кинотеатр</span>
								<b>{order.cinema.name}</b>
							</div>
						</div>
					</div>
					<div className="ticket-bottom">
						{showQr ? (
							tickets.map((ticket, index) => (
								<TicketQr
									key={ticket.id}
									code={ticket.code}
									status={ticket.status}
									label={`${ticketSeatLabel(order, ticket, index)} · ${order.session.hall.name}`}
								/>
							))
						) : (
							<p>{paid ? "Оплата получена. Готовим QR…" : "QR появится после оплаты"}</p>
						)}
					</div>
				</article>
			)}

			{pending && !expired ? (
				<div className="payment-methods">
					<p className="hold-line">Места удерживаются {formatCountdown(holdLeft)}</p>
					<fieldset>
						<legend>Способ оплаты</legend>
						{clickEnabled ? (
							<label>
								<input
									type="radio"
									name="payment"
									checked={method === "click"}
									onChange={() => setMethod("click")}
								/>{" "}
								Click
							</label>
						) : null}
						{rahmatEnabled ? (
							<label>
								<input
									type="radio"
									name="payment"
									checked={method === "rahmat"}
									onChange={() => setMethod("rahmat")}
								/>{" "}
								Rahmat
							</label>
						) : null}
						{!clickEnabled && !rahmatEnabled ? (
							<p className="note">Оплата временно недоступна. Обратитесь в кинотеатр.</p>
						) : null}
					</fieldset>
				</div>
			) : null}
			{pending && !expired && clickEnabled && method === "click" ? (
				<ClickCheckout amountUzs={order.totalUzs} orderId={order.id} onPaid={load} />
			) : null}

			{pending && !expired && rahmatEnabled && method === "rahmat" ? (
				<RahmatCheckout
					orderId={order.id}
					amountUzs={order.totalUzs}
					holdExpiresAt={order.holdExpiresAt}
					createdAt={order.createdAt}
					expired={expired}
					payReturn={payReturn}
					onPaid={load}
					onOrderRefresh={load}
				/>
			) : null}

			{expired ? <p className="note">Время брони истекло. Выберите места заново.</p> : null}
			{payReturn === "fail" || payReturn === "error" ? (
				<p className="note bad">Возврат из Rahmat: оплата не завершена.</p>
			) : null}

			{order.refunds?.map((refund) => (
				<p className="note" key={refund.id}>
					{refund.status === "PENDING"
						? "Заявка на возврат оформлена. Кинотеатр обрабатывает её вручную; срок зачисления уточните в кинотеатре."
						: refund.status === "SUCCEEDED"
							? "Возврат оформлен"
							: "Возврат отклонён. Обратитесь в кинотеатр."}{" "}
					· {formatPrice(refund.amountUzs)}
				</p>
			))}
			{paid ? (
				<SelfRefundPanel
					orderId={order.id}
					tickets={tickets.filter(
						(ticket) =>
							!order.refunds?.some(
								(refund) => refund.status === "PENDING" && refund.ticketIds.includes(ticket.id),
							),
					)}
					startsAt={order.session.startsAt}
					onDone={() => void load()}
				/>
			) : null}

			{!pending || expired ? (
				<div className={expired ? "stack checkout-bar expired-action" : "stack"}>
					{order.status === "EXPIRED" || expired ? (
						<LinkButton href={`/sessions/${order.session.id}`} className="v2-full">
							Выбрать места заново
						</LinkButton>
					) : null}
					<LinkButton href="/orders" variant="secondary" className="v2-full">
						Мои билеты
					</LinkButton>
					<Link href="/" className="v2-btn v2-btn-secondary v2-full">
						На афишу
					</Link>
				</div>
			) : null}
		</>
	);
}
