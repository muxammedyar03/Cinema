"use client";

import { Card, Toast } from "@cinema/ui";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { formatCountdown, formatPrice } from "../lib/format";
import { BookingAction } from "./booking-action";

type HoldResult = {
	orderId: string;
	publicNumber: number;
	totalUzs: number;
	holdExpiresAt: string;
	quantity: number;
	ttlSec: number;
};

export function GaBooking({
	sessionId,
	basePriceUzs,
	remaining,
}: {
	sessionId: string;
	basePriceUzs: number;
	remaining: number;
}) {
	const router = useRouter();
	const maxQty = Math.min(20, Math.max(0, remaining));
	const [qty, setQty] = useState(Math.min(2, maxQty || 1));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [hold, setHold] = useState<HoldResult | null>(null);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!hold) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [hold]);

	const total = basePriceUzs * qty;
	const holdLeft = hold ? new Date(hold.holdExpiresAt).getTime() - now : 0;

	async function book() {
		if (qty < 1 || qty > maxQty) return;
		setBusy(true);
		setError("");
		try {
			await ensureTelegramSession();
			const result = await clientApi<HoldResult>("/bookings/hold-ga", {
				method: "POST",
				body: JSON.stringify({ sessionId, quantity: qty }),
			});
			setHold(result);
			router.push(`/orders/${result.orderId}`);
		} catch {
			setError("Не хватает мест или ошибка брони. Обновите страницу.");
			router.refresh();
		} finally {
			setBusy(false);
		}
	}

	if (remaining <= 0) {
		return <p className="note">Мест не осталось</p>;
	}

	return (
		<>
			<Card>
				<div className="ga-card">
					<h2>Без назначения мест</h2>
					<p className="description">
						Выберите количество билетов. Места в зале не закрепляются — вход по QR после оплаты.
					</p>
					<div className="qty-row">
						<span>Билеты</span>
						<div className="qty-controls">
							<button
								type="button"
								disabled={qty <= 1 || Boolean(hold)}
								aria-label="Меньше"
								onClick={() => setQty((value) => Math.max(1, value - 1))}
							>
								<Minus size={16} strokeWidth={2} />
							</button>
							<span>{qty}</span>
							<button
								type="button"
								disabled={qty >= maxQty || Boolean(hold)}
								aria-label="Больше"
								onClick={() => setQty((value) => Math.min(maxQty, value + 1))}
							>
								<Plus size={16} strokeWidth={2} />
							</button>
						</div>
					</div>
					<p className="price-note">
						Доступно {remaining} · по {formatPrice(basePriceUzs)}
					</p>
				</div>
			</Card>
			{hold ? (
				<p className="hold-line" aria-live="polite">
					Бронь удерживается {formatCountdown(holdLeft)}
				</p>
			) : null}
			<Toast message={error} open={Boolean(error)} />
			<BookingAction
				summary={formatPrice(total)}
				detail={`${qty} билета`}
				label="Продолжить"
				busy={busy}
				disabled={qty < 1 || qty > maxQty}
				onClick={() => void book()}
			/>
		</>
	);
}
