"use client";

import { useMemo, useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import { formatPrice } from "../lib/format";
import { canSelfRefund, newIdempotencyKey } from "../lib/tickets";
import type { OrderTicket, RefundResult } from "../lib/types";
import { cx, ui } from "../lib/ui";

function ticketLabel(t: OrderTicket, index: number) {
	if (t.seatLabel) return t.seatLabel;
	if (t.type === "GENERAL_ADMISSION") return `GA ${index + 1}`;
	return `Билет ${index + 1}`;
}

export function SelfRefundPanel({
	orderId,
	tickets,
	startsAt,
	onDone,
}: {
	orderId: string;
	tickets: OrderTicket[];
	startsAt: string;
	onDone: () => void;
}) {
	const active = useMemo(() => tickets.filter((t) => t.status === "ACTIVE"), [tickets]);
	const [selected, setSelected] = useState<string[]>([]);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const allowed = canSelfRefund(startsAt);

	if (active.length === 0) return null;

	function toggle(id: string) {
		setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	}

	const chosen = selected.length === 0 ? active : active.filter((t) => selected.includes(t.id));
	const amount = chosen.reduce((sum, t) => sum + (t.unitPriceUzs ?? 0), 0);
	const full = selected.length === 0 || selected.length === active.length;

	async function submit() {
		if (!allowed) return;
		setBusy(true);
		setError("");
		setInfo("");
		try {
			const result = await clientApi<RefundResult>(`/orders/${orderId}/refunds`, {
				method: "POST",
				body: JSON.stringify({
					ticketIds: selected,
					reason: reason.trim() || undefined,
					idempotencyKey: newIdempotencyKey(),
				}),
			});
			setInfo(
				result.status === "PENDING"
					? "Возврат принят. Ждём подтверждение Rahmat…"
					: "Возврат оформлен",
			);
			onDone();
		} catch (err) {
			setError(errorText(err, "Не удалось оформить возврат"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="mt-6 rounded-2xl border border-line bg-elev/40 p-4">
			<h2 className="font-brand text-lg font-bold">Отмена билетов</h2>
			{!allowed ? (
				<p className="mt-2 text-[13px] leading-relaxed text-muted">
					Самостоятельный возврат доступен не позднее чем за 60 минут до сеанса. Обратитесь в
					кинотеатр.
				</p>
			) : (
				<>
					<p className="mt-1 text-[12px] text-muted">
						Пустой выбор — вернуть все активные билеты. Частичный возврат через Rahmat.
					</p>
					<ul className="mt-3 flex flex-col gap-1.5">
						{active.map((t, i) => (
							<li key={t.id}>
								<label className="flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-sm">
									<input
										type="checkbox"
										checked={selected.includes(t.id)}
										onChange={() => toggle(t.id)}
									/>
									<span className="flex-1 font-medium">{ticketLabel(t, i)}</span>
									{t.unitPriceUzs ? (
										<span className="text-xs text-orange">{formatPrice(t.unitPriceUzs)}</span>
									) : null}
								</label>
							</li>
						))}
					</ul>
					<label className="mt-3 block text-[12px] text-muted">
						Причина (необязательно)
						<input
							className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Передумали / ошибка сеанса"
						/>
					</label>
					{error ? <p className="mt-2 text-xs text-bad">{error}</p> : null}
					{info ? <p className="mt-2 text-xs text-ok">{info}</p> : null}
					<button
						className={cx(ui.cta, ui.ctaBlock, "mt-3")}
						type="button"
						disabled={busy}
						onClick={() => void submit()}
					>
						{busy
							? "…"
							: full
								? "Вернуть все билеты"
								: `Вернуть выбранные${amount ? ` · ${formatPrice(amount)}` : ""}`}
					</button>
				</>
			)}
		</section>
	);
}
