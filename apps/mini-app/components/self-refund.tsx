"use client";

import { Button, Card, Toast } from "@cinema/ui";
import { useMemo, useState } from "react";
import { clientApi } from "../lib/api";
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
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const allowed = canSelfRefund(startsAt);

	if (active.length === 0) return null;

	function toggle(id: string) {
		setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
	}

	const chosen =
		selected.length === 0 ? active : active.filter((ticket) => selected.includes(ticket.id));
	const amount = chosen.reduce((sum, ticket) => sum + (ticket.unitPriceUzs ?? 0), 0);
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
								Пустой выбор — вернуть все активные билеты. Можно вернуть и один билет.
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
								disabled={busy}
								onClick={() => void submit()}
							>
								{busy
									? "…"
									: full
										? `Вернуть все${amount ? ` · ${formatPrice(amount)}` : ""}`
										: `Вернуть выбранные${amount ? ` · ${formatPrice(amount)}` : ""}`}
							</Button>
						</>
					)}
				</div>
			</Card>
			<Toast message={error || info} open={Boolean(error || info)} />
		</div>
	);
}
