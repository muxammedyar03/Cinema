"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi, ensureTelegramSession } from "../../../lib/api";
import { formatPrice, formatTime } from "../../../lib/format";
import { cx, ui } from "../../../lib/ui";

type OrderDetail = {
	id: string;
	publicNumber: number;
	status: string;
	totalUzs: number;
	holdExpiresAt: string | null;
	cinema: { name: string };
	session: {
		id: string;
		startsAt: string;
		movie: { title: string };
		hall: { name: string };
	};
	items: Array<{
		seatLabel: string | null;
		seatType: string | null;
		unitPriceUzs: number;
		quantity: number;
		type?: string;
	}>;
};

function formatCountdown(ms: number) {
	if (ms <= 0) return "00:00";
	const total = Math.floor(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
		default:
			return status;
	}
}

export function OrderHoldView({ orderId }: { orderId: string }) {
	const [order, setOrder] = useState<OrderDetail | null>(null);
	const [error, setError] = useState("");
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				await ensureTelegramSession();
				const data = await clientApi<OrderDetail>(`/bookings/orders/${orderId}`);
				if (!cancelled) setOrder(data);
			} catch {
				if (!cancelled) setError("Заказ не найден");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [orderId]);

	useEffect(() => {
		if (!order?.holdExpiresAt || order.status !== "PENDING_PAYMENT") return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [order?.holdExpiresAt, order?.status]);

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

	return (
		<div className="px-5 pb-10 pt-14">
			<div className="overflow-hidden rounded-[22px] border border-line bg-linear-to-br from-[#1c1c1c] to-[#121212] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
				<p className="text-[11px] tracking-wide text-muted uppercase">
					Бронь · #{order.publicNumber}
				</p>
				<h1 className="mt-2 font-brand text-[26px] font-extrabold tracking-tight">
					{order.session.movie.title}
				</h1>

				<div className="mx-auto my-7 grid size-[148px] place-items-center rounded-2xl border border-dashed border-line bg-elev/50 text-center text-[11px] leading-relaxed text-muted">
					QR после оплаты
					<br />
					<span className="text-faint">(фаза 11)</span>
				</div>

				<dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[13px]">
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
				<p className="mt-5 text-center font-mono text-sm text-orange tabular-nums">
					Hold {formatCountdown(holdLeft)} · оплата — следующая фаза
				</p>
			) : null}
			{expired ? (
				<p className="mt-5 text-center text-sm text-muted">
					Время брони истекло. Выберите места снова.
				</p>
			) : null}

			<div className="mt-6 flex flex-col gap-2">
				{order.status === "EXPIRED" || expired ? (
					<Link href={`/sessions/${order.session.id}`} className={cx(ui.cta, ui.ctaBlock)}>
						Выбрать места снова
					</Link>
				) : (
					<button className={cx(ui.cta, ui.ctaBlock)} type="button" disabled>
						Оплатить (скоро)
					</button>
				)}
				<Link href="/" className={cx(ui.cta, ui.ctaBlock, ui.ctaGhost, "border border-line")}>
					На афишу
				</Link>
				{pending && !expired ? (
					<p className="text-center text-xs text-muted">
						Держим места 10 минут. Оплата Click — фаза 11.
					</p>
				) : null}
			</div>
		</div>
	);
}
