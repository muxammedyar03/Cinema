"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi, ensureTelegramSession } from "../../lib/api";
import { errorText } from "../../lib/api-error";
import { formatPrice, formatTime } from "../../lib/format";
import { ui } from "../../lib/ui";

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
			return "Возврат…";
		case "REFUNDED":
			return "Возвращён";
		default:
			return status;
	}
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
		<div className="px-[18px] pt-5 pb-8">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-brand text-2xl font-extrabold">Билеты</h1>
				<Link href="/" className="text-xs text-muted">
					Афиша
				</Link>
			</div>
			{error ? <p className="text-sm text-bad">{error}</p> : null}
			{orders === null && !error ? <p className={ui.empty}>Загрузка…</p> : null}
			{orders?.length === 0 ? (
				<p className={ui.empty}>Пока нет броней. Выберите фильм и места.</p>
			) : null}
			<ul className="flex flex-col gap-2.5">
				{orders?.map((o) => (
					<li key={o.id}>
						<Link
							href={`/orders/${o.id}`}
							className="block rounded-[16px] border border-line bg-elev/60 px-4 py-3.5"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="truncate font-semibold">{o.movieTitle}</div>
									<div className="mt-1 text-[12px] text-muted">
										{o.cinemaName} · {o.hallName} · {formatTime(o.startsAt)}
									</div>
									<div className="mt-1 text-[11px] text-faint">
										#{o.publicNumber} · {o.itemCount} мест · {statusRu(o.status)}
									</div>
								</div>
								<div className="shrink-0 text-right text-sm font-bold text-orange">
									{formatPrice(o.totalUzs)}
								</div>
							</div>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
