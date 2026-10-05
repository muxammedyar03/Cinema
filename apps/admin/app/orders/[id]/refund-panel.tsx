"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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

type Refund = { id: string; status: string; amountUzs: number; ticketIds: string[] };
export function OrderRefundPanel({
	orderId,
	tickets,
	refunds = [],
	canResolve = false,
}: {
	orderId: string;
	tickets: Ticket[];
	refunds?: Refund[];
	canResolve?: boolean;
}) {
	const router = useRouter();
	const key = useRef(newIdempotencyKey());
	const [reference, setReference] = useState("");
	const active = useMemo(() => tickets.filter((t) => t.status === "ACTIVE"), [tickets]);
	const [selected, setSelected] = useState<string[]>([]);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [ok, setOk] = useState("");

	if (active.length === 0 && refunds.length === 0) {
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
					idempotencyKey: key.current,
				}),
			});
			setOk("Заявка сохранена. Верните деньги через провайдера, затем укажите подтверждение.");
			key.current = newIdempotencyKey();
			router.refresh();
		} catch (err) {
			setError(errorText(err, "Не удалось оформить возврат"));
		} finally {
			setBusy(false);
		}
	}

	async function resolve(id: string, status: "SUCCEEDED" | "FAILED") {
		if (
			!window.confirm(
				status === "SUCCEEDED"
					? "Подтвердить, что деньги уже возвращены через провайдера?"
					: "Отклонить заявку?",
			)
		)
			return;
		setBusy(true);
		setError("");
		try {
			await clientApi(`/admin/orders/${orderId}/refunds/${id}/resolve`, {
				method: "POST",
				body: JSON.stringify({ status, reference }),
			});
			setOk("Заявка обработана");
			router.refresh();
		} catch (err) {
			setError(errorText(err, "Не удалось обработать заявку"));
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="px-4 py-3">
			{refunds.map((refund) => (
				<div key={refund.id} className="mb-3">
					<p>
						Возврат · {refund.amountUzs.toLocaleString("ru-RU")} сум ·{" "}
						{refund.status === "PENDING"
							? "На рассмотрении"
							: refund.status === "SUCCEEDED"
								? "Выполнен"
								: "Отклонён"}
					</p>
					{refund.status === "PENDING" && canResolve ? (
						<>
							<label>
								Номер подтверждения провайдера / причина отказа
								<input
									className={ui.input}
									value={reference}
									onChange={(e) => setReference(e.target.value)}
								/>
							</label>
							<button
								className={ui.btn}
								type="button"
								disabled={busy || reference.trim().length < 3}
								onClick={() => void resolve(refund.id, "SUCCEEDED")}
							>
								Деньги возвращены
							</button>
							<button
								className={ui.btn}
								type="button"
								disabled={busy || reference.trim().length < 3}
								onClick={() => void resolve(refund.id, "FAILED")}
							>
								Отклонить
							</button>
						</>
					) : null}
				</div>
			))}
			<p className="text-[12px] text-muted">
				Выберите билеты. Деньги возвращаются вручную через платёжного провайдера.
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
				disabled={busy || !selected.length}
				onClick={() => void submit()}
			>
				{busy ? "…" : "Оформить заявку"}
			</button>
		</div>
	);
}
