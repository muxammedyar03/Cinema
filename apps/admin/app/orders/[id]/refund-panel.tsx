"use client";

import { useMemo, useState } from "react";
import { clientApi } from "../../../lib/api";
import { errorText } from "../../../lib/api-error";
import { displayTicketCode, newIdempotencyKey } from "../../../lib/tickets";
import { cx, ui } from "../../../lib/ui";

type Ticket = {
	id: string;
	code: string;
	status: string;
	type?: string;
	seatLabel?: string | null;
	unitPriceUzs?: number;
};

export function OrderRefundPanel({ orderId, tickets }: { orderId: string; tickets: Ticket[] }) {
	const active = useMemo(() => tickets.filter((t) => t.status === "ACTIVE"), [tickets]);
	const [selected, setSelected] = useState<string[]>([]);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [ok, setOk] = useState("");

	if (active.length === 0) {
		return <p className="px-4 py-3 text-sm text-muted">Нет активных билетов для возврата.</p>;
	}

	async function submit() {
		setBusy(true);
		setError("");
		setOk("");
		try {
			await clientApi(`/admin/orders/${orderId}/refunds`, {
				method: "POST",
				body: JSON.stringify({
					ticketIds: selected,
					reason: reason.trim() || undefined,
					idempotencyKey: newIdempotencyKey(),
				}),
			});
			setOk("Возврат отправлен в Rahmat");
		} catch (err) {
			setError(errorText(err, "Не удалось оформить возврат"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="px-4 py-3">
			<p className="text-[12px] text-muted">
				Пустой выбор — полный возврат активных билетов (Rahmat).
			</p>
			<ul className="mt-2 flex flex-col gap-1.5">
				{active.map((t) => (
					<li key={t.id}>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={selected.includes(t.id)}
								onChange={() =>
									setSelected((prev) =>
										prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id],
									)
								}
							/>
							<span className="font-mono text-xs">{displayTicketCode(t.code)}</span>
							<span>{t.seatLabel ?? t.type ?? t.id.slice(-6)}</span>
						</label>
					</li>
				))}
			</ul>
			<label className={cx(ui.field, "mt-3")}>
				<span className={ui.label}>Причина</span>
				<input
					className={ui.input}
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Отмена / ошибка"
				/>
			</label>
			{error ? <p className={ui.err}>{error}</p> : null}
			{ok ? <p className={ui.okMsg}>{ok}</p> : null}
			<button
				className={cx(ui.btn, ui.btnWarn)}
				type="button"
				disabled={busy}
				onClick={() => void submit()}
			>
				{busy ? "…" : selected.length ? "Вернуть выбранные" : "Вернуть все"}
			</button>
		</div>
	);
}
