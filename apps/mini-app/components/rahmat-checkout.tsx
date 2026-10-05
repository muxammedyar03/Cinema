"use client";
import { Button } from "@cinema/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import { formatPrice } from "../lib/format";
import { openExternalUrl } from "../lib/telegram";
import type { RahmatPayment } from "../lib/types";

export function RahmatCheckout({
	orderId,
	amountUzs,
	expired,
	onPaid,
	onOrderRefresh,
}: {
	orderId: string;
	amountUzs: number;
	expired: boolean;
	holdExpiresAt: string | null;
	createdAt?: string;
	payReturn: string | null;
	onPaid: () => void;
	onOrderRefresh: () => Promise<void>;
}) {
	const onPaidRef = useRef(onPaid);
	useEffect(() => {
		onPaidRef.current = onPaid;
	}, [onPaid]);

	const [payment, setPayment] = useState<RahmatPayment | null>(null);
	const [binding, setBinding] = useState<string | null>(null);
	const [otp, setOtp] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const key = `rahmat-bind:${orderId}`;
	useEffect(() => {
		setBinding(sessionStorage.getItem(key));
	}, [key]);
	const refresh = useCallback(async () => {
		const row = await clientApi<RahmatPayment>(`/orders/${orderId}/payment`).catch(() => null);
		if (row) {
			const current = await clientApi<RahmatPayment>(`/payments/${row.paymentId}/sync`, {
				method: "POST",
			}).catch(() => row);
			setPayment(current);
			if (current.status === "PAID") onPaidRef.current();
		}
	}, [orderId]);
	useEffect(() => {
		let running = false;
		const poll = async () => {
			if (running) return;
			running = true;
			try {
				await refresh();
			} finally {
				running = false;
			}
		};
		void poll();
		const timer = setInterval(() => {
			if (!expired && document.visibilityState === "visible") void poll();
		}, 5000);
		return () => clearInterval(timer);
	}, [refresh, expired]);
	async function action(work: () => Promise<void>) {
		setBusy(true);
		setError("");
		try {
			await work();
		} catch (e) {
			setError(errorText(e, "Не удалось выполнить оплату"));
		} finally {
			setBusy(false);
		}
	}
	async function bind() {
		const result = await clientApi<{ sessionId: string; formUrl: string }>(
			"/payments/rahmat/bind",
			{ method: "POST", body: JSON.stringify({ orderId }) },
		);
		sessionStorage.setItem(key, result.sessionId);
		setBinding(result.sessionId);
		openExternalUrl(result.formUrl);
	}
	async function create() {
		const row = await clientApi<RahmatPayment>("/payments/rahmat/create", {
			method: "POST",
			body: JSON.stringify({ orderId, bindingId: binding }),
		});
		setPayment(row);
		if (row.status === "PAID") {
			onPaid();
			return;
		}
	}
	async function confirm() {
		const row = await clientApi<RahmatPayment>(`/payments/${payment?.paymentId}/confirm`, {
			method: "POST",
			body: JSON.stringify(payment?.otpRequired ? { otp } : {}),
		});
		setOtp("");
		setPayment(row);
		await onOrderRefresh();
		if (row.status === "PAID") onPaid();
	}
	if (expired) return null;
	return (
		<div className="stack">
			<p className="note">
				Rahmat · {formatPrice(amountUzs)}. Данные карты вводятся на защищённой странице Multicard.
			</p>
			{error ? <p className="note bad">{error}</p> : null}
			{!payment ? (
				<>
					<Button disabled={busy} onClick={() => void action(binding ? create : bind)}>
						{binding ? "Карта привязана — продолжить оплату" : "Привязать карту и оплатить Rahmat"}
					</Button>
					{binding ? (
						<Button variant="secondary" disabled={busy} onClick={() => void action(bind)}>
							Привязать другую карту
						</Button>
					) : null}
				</>
			) : payment.status === "FAILED" ? (
				<p className="note bad">
					Оплата отклонена. Обратитесь в поддержку перед повторной попыткой.
				</p>
			) : payment.status === "CREATING" ? (
				<p className="note">
					Платёж обрабатывается. При неизвестном результате обратитесь в поддержку — повторное
					списание заблокировано.
				</p>
			) : payment.status !== "PAID" ? (
				<>
					{payment.otpRequired ? (
						<label>
							Код из SMS
							<input
								aria-label="Код SMS"
								inputMode="numeric"
								autoComplete="one-time-code"
								value={otp}
								onChange={(e) => setOtp(e.target.value)}
							/>
						</label>
					) : null}
					<Button
						disabled={busy || (payment.otpRequired && !/^\d{4,8}$/.test(otp))}
						onClick={() => void action(confirm)}
					>
						Подтвердить оплату
					</Button>
					<Button variant="secondary" disabled={busy} onClick={() => void action(refresh)}>
						Проверить оплату
					</Button>
				</>
			) : (
				<p className="note">Оплачено</p>
			)}
		</div>
	);
}
