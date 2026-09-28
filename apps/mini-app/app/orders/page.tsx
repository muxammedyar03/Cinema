"use client";

import { Badge, EmptyState, PageHeader } from "@cinema/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "../../components/link-button";
import { clientApi, ensureTelegramSession } from "../../lib/api";
import { errorText } from "../../lib/api-error";
import { formatPrice, formatTime } from "../../lib/format";

type OrderRow = {
	id: string;
	publicNumber: number;
	status: string;
	totalUzs: number;
	holdExpiresAt: string | null;
	cinemaName: string;
	movieTitle: string;
	hallName: string;
	startsAt: string;
	itemCount: number;
};

function statusRu(status: string) {
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

function tone(status: string): "ok" | "warn" | "bad" | "neutral" {
	if (status === "PAID") return "ok";
	if (status === "PENDING_PAYMENT" || status === "REFUND_PENDING") return "warn";
	if (status === "EXPIRED" || status === "CANCELLED" || status === "REFUNDED") return "bad";
	return "neutral";
}

export default function MyOrdersPage() {
	const [orders, setOrders] = useState<OrderRow[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		void (async () => {
			try {
				await ensureTelegramSession();
				setOrders(await clientApi<OrderRow[]>("/bookings/orders"));
			} catch (err) {
				setError(errorText(err, "Не удалось загрузить заказы"));
			}
		})();
	}, []);

	return (
		<>
			<div className="pad">
				<PageHeader title="Мои билеты" description="Билеты и брони этого аккаунта" />
			</div>
			{error ? <p className="note bad">{error}</p> : null}
			{orders === null && !error ? <p className="note">Загрузка…</p> : null}
			{orders?.length === 0 ? (
				<EmptyState
					title="Билетов пока нет"
					description="Выберите фильм в афише и забронируйте места."
					action={<LinkButton href="/">К афише</LinkButton>}
				/>
			) : null}
			<ul className="order-list">
				{orders?.map((order) => (
					<li key={order.id}>
						<Link href={`/orders/${order.id}`} className="order-row">
							<div className="order-row-top">
								<div>
									<b>{order.movieTitle}</b>
									<small>
										{order.cinemaName} · {order.hallName} · {formatTime(order.startsAt)}
									</small>
									<span className="meta-line">
										#{order.publicNumber} · {order.itemCount} бил.
									</span>
								</div>
								<div>
									<Badge tone={tone(order.status)}>{statusRu(order.status)}</Badge>
									<div className="order-price">{formatPrice(order.totalUzs)}</div>
								</div>
							</div>
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}
