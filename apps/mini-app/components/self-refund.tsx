"use client";

import { Button, Card, Toast } from "@cinema/ui";
import { useMemo, useRef, useState } from "react";
import { ApiError, clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import { formatPrice } from "../lib/format";
import { canSelfRefund, newIdempotencyKey } from "../lib/tickets";
import type { OrderTicket, RefundResult } from "../lib/types";

function ticketLabel(ticket: OrderTicket, index: number) {
	if (ticket.seatLabel) return ticket.seatLabel;
	if (ticket.type === "GENERAL_ADMISSION") return `Входной билет ${index + 1}`;
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
	const active = useMemo(() => tickets.filter((ticket) => ticket.status === "ACTIVE"), [tickets]);
	const [selected, setSelected] = useState<string[]>([]);
	const keyRef = useRef(newIdempotencyKey());
	const [confirming, setConfirming] = useState(false);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const allowed = canSelfRefund(startsAt);

	if (active.length === 0) return null;

	function toggle(id: string) {
		keyRef.current = newIdempotencyKey();
		setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
	}

	const chosen = active.filter((ticket) => selected.includes(ticket.id));
	const amount = chosen.reduce((sum, ticket) => sum + (ticket.unitPriceUzs ?? 0), 0);

	async function submit() {
		if (!allowed || !chosen.length || !confirming) return;
		setBusy(true);
		setError("");
		setInfo("");
		try {
			const result = await clientApi<RefundResult>(`/orders/${orderId}/refunds`, {
				method: "POST",
				body: JSON.stringify({
					ticketIds: chosen.map((t) => t.id),
					reason: reason.trim() || undefined,
					idempotencyKey: keyRef.current,
				}),
			});
			setInfo(
				result.status === "PENDING"
					? `Заявка на возврат оформлена · ${formatPrice(result.amountUzs ?? amount)}. Кинотеатр обработает её вручную через платёжного провайдера. Срок зачисления уточните в кинотеатре.`
					: `Возврат оформлен · ${formatPrice(result.amountUzs ?? amount)}`,
			);
			setConfirming(false);
			keyRef.current = newIdempotencyKey();
			onDone();
		} catch (err) {
			setError(
				err instanceof ApiError && err.status === 404
					? "Сервис возвратов временно недоступен. Обратитесь в кинотеатр с номером заказа."
					: errorText(err, "Не удалось оформить возврат"),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="stack">
			<Card>
				<div className="ga-card">
					<h2>Отмена билетов</h2>
					{!allowed ? (
						<p className="description">
							Самостоятельный возврат доступен не позднее чем за 60 минут до сеанса. Обратитесь в
							кинотеатр.
						</p>
					) : (
						<>
							<p className="description">
								Выберите билеты. Возврат выполняет кинотеатр через платёжного провайдера.
							</p>
							<ul className="refund-list">
								{active.map((ticket, index) => (
									<li key={ticket.id}>
										<label className="refund-item">
											<input
												type="checkbox"
												checked={selected.includes(ticket.id)}
												onChange={() => toggle(ticket.id)}
											/>
											<span>{ticketLabel(ticket, index)}</span>
											{ticket.unitPriceUzs ? <b>{formatPrice(ticket.unitPriceUzs)}</b> : null}
										</label>
									</li>
								))}
							</ul>
							<label className="meta-line">
								Причина (необязательно)
								<input
									className="field"
									value={reason}
									onChange={(event) => setReason(event.target.value)}
									placeholder="Передумали"
								/>
							</label>
							<Button
								type="button"
								className="v2-full"
								disabled={busy || chosen.length === 0}
								onClick={() => setConfirming(true)}
							>
								{busy ? "Подождите…" : `Вернуть ${chosen.length} билета · ${formatPrice(amount)}`}
							</Button>
						</>
					)}
				</div>
			</Card>
			{confirming ? (
				<div
					className="refund-confirm"
					role="dialog"
					aria-modal="true"
					aria-labelledby="refund-title"
				>
					<div>
						<h2 id="refund-title">Оформить возврат?</h2>
						<p>
							{chosen.length} билета · {formatPrice(amount)}
						</p>
						<p>Деньги вернёт кинотеатр через провайдера. Это заявка, а не мгновенное зачисление.</p>
						<Button type="button" disabled={busy} onClick={() => void submit()}>
							Подтвердить возврат
						</Button>
						<Button
							type="button"
							variant="secondary"
							disabled={busy}
							onClick={() => setConfirming(false)}
						>
							Отмена
						</Button>
					</div>
				</div>
			) : null}
			{info ? <output className="note">{info}</output> : null}
			<Toast message={error || info} open={Boolean(error || info)} />
		</div>
	);
}
