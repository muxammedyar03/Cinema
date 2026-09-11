"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RahmatCheckout } from "../../../components/rahmat-checkout";
import { SelfRefundPanel } from "../../../components/self-refund";
import { TicketQr } from "../../../components/ticket-qr";
import { clientApi, ensureTelegramSession } from "../../../lib/api";
import { errorText } from "../../../lib/api-error";
import { formatPrice, formatTime } from "../../../lib/format";
import type { OrderDetail, OrderTicket } from "../../../lib/types";
import { cx, ui } from "../../../lib/ui";

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
			return "Возврат…";
		case "REFUNDED":
			return "Возвращён";
		default:
			return status;
	}
}

function ticketSeatLabel(order: OrderDetail, ticket: OrderTicket, index: number): string {
	if (ticket.seatLabel) return ticket.seatLabel;
	const seats = order.items.map((i) => i.seatLabel).filter(Boolean) as string[];
	if (ticket.type === "SEAT" && seats[index]) return seats[index];
	if (
		ticket.type === "GENERAL_ADMISSION" ||
		order.items.some((i) => i.type === "GENERAL_ADMISSION")
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
				if (!cancelled) await load();
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
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [order?.holdExpiresAt, order?.status]);

	const tickets = useMemo(() => order?.tickets ?? [], [order]);
	const paid = order?.status === "PAID" || order?.status === "REFUND_PENDING";
	const refunded = order?.status === "REFUNDED";

	if (error) {
		return (
			<div className="px-5 py-16 text-center">
				<p className="text-sm text-bad">{error}</p>
				<Link href="/" className={cx(ui.cta, "mt-6 inline-flex")}>
					На главную
				</Link>
			</div>
		);
	}

	if (!order) {
		return <p className={ui.empty}>Загрузка…</p>;
	}

	const holdLeft = order.holdExpiresAt ? new Date(order.holdExpiresAt).getTime() - now : 0;
	const seats = order.items
		.map((i) => i.seatLabel)
		.filter(Boolean)
		.join(" · ");
	const gaQty = order.items
		.filter((i) => i.type === "GENERAL_ADMISSION")
		.reduce((n, i) => n + i.quantity, 0);
	const placesLabel = seats || (gaQty > 0 ? `${gaQty} бил. (GA)` : "—");
	const pending = order.status === "PENDING_PAYMENT";
	const expired = order.status === "EXPIRED" || (pending && holdLeft <= 0);
	const showQr = (paid || refunded) && tickets.length > 0;

	return (
		<div className="px-5 pb-10 pt-14">
			<div className="overflow-hidden rounded-[22px] border border-line bg-linear-to-br from-[#1c1c1c] to-[#121212] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
				<p className="text-[11px] tracking-wide text-muted uppercase">
					{paid || refunded ? "Билет" : "Бронь"} · #{order.publicNumber}
				</p>
				<h1 className="mt-2 font-brand text-[26px] font-extrabold tracking-tight">
					{order.session.movie.title}
				</h1>

				{showQr ? (
					<div className="mt-6 flex flex-col gap-3">
						{tickets.map((t, i) => (
							<TicketQr
								key={t.id}
								code={t.code}
								status={t.status}
								label={`${ticketSeatLabel(order, t, i)} · ${order.session.hall.name}`}
							/>
						))}
					</div>
				) : paid && tickets.length === 0 ? (
					<div className="mx-auto my-7 grid size-[148px] place-items-center rounded-2xl border border-dashed border-ok/40 bg-elev/50 text-center text-[11px] leading-relaxed text-muted">
						Оплата получена
						<br />
						<span className="text-faint">Готовим QR…</span>
					</div>
				) : (
					<div className="mx-auto my-7 grid size-[148px] place-items-center rounded-2xl border border-dashed border-line bg-elev/50 text-center text-[11px] leading-relaxed text-muted">
						QR после оплаты Rahmat
					</div>
				)}

				<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 text-[13px]">
					<div>
						<dt className="text-[11px] text-faint">Дата</dt>
						<dd className="mt-0.5 font-semibold">
							{new Date(order.session.startsAt).toLocaleDateString("ru-RU", {
								day: "numeric",
								month: "short",
							})}
							, {formatTime(order.session.startsAt)}
						</dd>
					</div>
					<div>
						<dt className="text-[11px] text-faint">{gaQty > 0 ? "Билеты" : "Места"}</dt>
						<dd className="mt-0.5 font-semibold">{placesLabel}</dd>
					</div>
					<div>
						<dt className="text-[11px] text-faint">Кинотеатр</dt>
						<dd className="mt-0.5 font-semibold">{order.cinema.name}</dd>
					</div>
					<div>
						<dt className="text-[11px] text-faint">Зал</dt>
						<dd className="mt-0.5 font-semibold">{order.session.hall.name}</dd>
					</div>
					<div>
						<dt className="text-[11px] text-faint">Сумма</dt>
						<dd className="mt-0.5 font-semibold text-orange">{formatPrice(order.totalUzs)}</dd>
					</div>
					<div>
						<dt className="text-[11px] text-faint">Статус</dt>
						<dd className="mt-0.5 font-semibold">
							{expired && pending ? "Истёк" : statusLabel(order.status)}
						</dd>
					</div>
				</dl>
			</div>

			{pending && !expired ? (
				<RahmatCheckout
					orderId={order.id}
					amountUzs={order.totalUzs}
					holdExpiresAt={order.holdExpiresAt}
					createdAt={order.createdAt}
					expired={expired}
					payReturn={payReturn}
					onPaid={() => void load()}
					onOrderRefresh={async () => {
						await load();
					}}
				/>
			) : null}

			{expired ? (
				<p className="mt-5 text-center text-sm text-muted">
					Время брони истекло. Выберите места снова.
				</p>
			) : null}

			{payReturn === "fail" || payReturn === "error" ? (
				<p className="mt-3 text-center text-sm text-bad">Возврат из Rahmat: оплата не завершена.</p>
			) : null}

			{paid && tickets.length === 0 ? (
				<p className="mt-4 text-center text-sm text-muted">Проверяем статус оплаты…</p>
			) : null}

			{paid ? (
				<SelfRefundPanel
					orderId={order.id}
					tickets={tickets}
					startsAt={order.session.startsAt}
					onDone={() => void load()}
				/>
			) : null}

			<div className="mt-6 flex flex-col gap-2">
				{order.status === "EXPIRED" || expired ? (
					<Link href={`/sessions/${order.session.id}`} className={cx(ui.cta, ui.ctaBlock)}>
						Выбрать места снова
					</Link>
				) : null}
				<Link href="/orders" className={cx(ui.cta, ui.ctaBlock, ui.ctaGhost, "border border-line")}>
					Мои билеты
				</Link>
				<Link href="/" className={cx(ui.cta, ui.ctaBlock, ui.ctaGhost, "border border-line")}>
					На афишу
				</Link>
			</div>
		</div>
	);
}
