"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { formatPrice } from "../lib/format";
import { cx, ui } from "../lib/ui";

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

	const total = basePriceUzs * qty;

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
			router.push(`/orders/${result.orderId}`);
		} catch {
			setError("Не хватает мест или ошибка брони. Обновите страницу.");
			router.refresh();
		} finally {
			setBusy(false);
		}
	}

	if (remaining <= 0) {
		return <p className={ui.empty}>Мест не осталось</p>;
	}

	return (
		<div className="px-4 pb-28 pt-4">
			<div className={cx("rounded-2xl border border-line bg-elev/50 p-5")}>
				<p className="text-[11px] uppercase tracking-wide text-faint">General admission</p>
				<h2 className="mt-1 font-brand text-xl font-bold">Без назначения мест</h2>
				<p className="mt-2 text-[13px] leading-relaxed text-muted">
					Выберите количество билетов. Места в зале не закрепляются — вход по QR после оплаты.
				</p>

				<div className="mt-6 flex items-center justify-between gap-3">
					<span className="text-sm text-muted">Билеты</span>
					<div className="flex items-center gap-2 rounded-full border border-line bg-surface p-1">
						<button
							type="button"
							className="grid size-9 place-items-center rounded-full text-ink disabled:opacity-35"
							disabled={qty <= 1}
							aria-label="Меньше"
							onClick={() => setQty((q) => Math.max(1, q - 1))}
						>
							<Minus className="size-4" strokeWidth={2} />
						</button>
						<span className="min-w-[2rem] text-center font-mono text-lg font-bold tabular-nums">
							{qty}
						</span>
						<button
							type="button"
							className="grid size-9 place-items-center rounded-full text-ink disabled:opacity-35"
							disabled={qty >= maxQty}
							aria-label="Больше"
							onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
						>
							<Plus className="size-4" strokeWidth={2} />
						</button>
					</div>
				</div>

				<p className="mt-3 text-[12px] text-faint">
					Доступно {remaining} · по {formatPrice(basePriceUzs)}
				</p>
			</div>

			{error ? <p className="mt-3 text-center text-xs text-bad">{error}</p> : null}

			<div className="fixed bottom-4 left-1/2 z-30 flex w-[min(448px,calc(100%-24px))] -translate-x-1/2 items-center justify-between gap-3 rounded-[20px] border border-line bg-elev/92 px-4 py-3.5 backdrop-blur-[16px]">
				<div className="min-w-0 text-xs text-muted">
					{qty} × {formatPrice(basePriceUzs)}
					<b className="mt-0.5 block truncate text-[17px] font-bold text-ink">
						{formatPrice(total)}
					</b>
				</div>
				<button className={ui.cta} type="button" disabled={busy || qty < 1} onClick={book}>
					{busy ? "…" : "Забронировать"}
				</button>
			</div>
		</div>
	);
}
