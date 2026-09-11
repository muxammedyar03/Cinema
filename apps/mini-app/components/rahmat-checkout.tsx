"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import { formatCountdown, formatPrice } from "../lib/format";
import { openExternalUrl } from "../lib/telegram";
import type { RahmatPayment } from "../lib/types";
import { cx, ui } from "../lib/ui";

const HOLD_TTL_MS = 10 * 60 * 1000;
const POLL_MS = 4000;

function paymentIdOf(p: RahmatPayment): string | undefined {
	return p.paymentId ?? p.id;
}

function isPaidStatus(status: string) {
	return status === "PAID" || status === "success";
}

function isFailedStatus(status: string) {
	return status === "FAILED" || status === "cancelled" || status === "error";
}

export function RahmatCheckout({
	orderId,
	amountUzs,
	holdExpiresAt,
	createdAt,
	expired,
	payReturn,
	onPaid,
	onOrderRefresh,
}: {
	orderId: string;
	amountUzs: number;
	holdExpiresAt: string | null;
	createdAt?: string;
	expired: boolean;
	payReturn: string | null;
	onPaid: () => void;
	onOrderRefresh: () => Promise<void>;
}) {
	const [payment, setPayment] = useState<RahmatPayment | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [now, setNow] = useState(() => Date.now());
	const [awaiting, setAwaiting] = useState(false);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const paymentRef = useRef<RahmatPayment | null>(null);
	const returnHandled = useRef(false);

	useEffect(() => {
		paymentRef.current = payment;
	}, [payment]);

	const holdLeft = holdExpiresAt ? new Date(holdExpiresAt).getTime() - now : 0;
	const holdTotal = (() => {
		if (holdExpiresAt && createdAt) {
			return Math.max(1, new Date(holdExpiresAt).getTime() - new Date(createdAt).getTime());
		}
		return HOLD_TTL_MS;
	})();
	const holdPct = Math.max(0, Math.min(100, (holdLeft / holdTotal) * 100));

	const stopPoll = useCallback(() => {
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	const syncPayment = useCallback(
		async (id?: string) => {
			const pid = id ?? (paymentRef.current ? paymentIdOf(paymentRef.current) : undefined);
			try {
				if (pid) {
					await clientApi(`/payments/${pid}/sync`, { method: "POST" }).catch(() => undefined);
					const snap = await clientApi<RahmatPayment>(`/payments/${pid}`).catch(() => null);
					if (snap) {
						setPayment(snap);
						if (isPaidStatus(snap.status)) {
							stopPoll();
							onPaid();
							return "PAID";
						}
						if (isFailedStatus(snap.status)) {
							setAwaiting(false);
							setError("Оплата не прошла. Можно попробовать снова, пока бронь активна.");
							return "FAILED";
						}
					}
				}
				const byOrder = await clientApi<RahmatPayment>(`/orders/${orderId}/payment`).catch(
					() => null,
				);
				if (byOrder) {
					setPayment(byOrder);
					if (isPaidStatus(byOrder.status)) {
						stopPoll();
						onPaid();
						return "PAID";
					}
				}
				await onOrderRefresh();
			} catch (err) {
				setError(errorText(err, "Не удалось проверить оплату"));
			}
			return "PENDING";
		},
		[onOrderRefresh, onPaid, orderId, stopPoll],
	);

	const startPoll = useCallback(
		(id?: string) => {
			stopPoll();
			setAwaiting(true);
			pollRef.current = setInterval(() => {
				void syncPayment(id);
			}, POLL_MS);
		},
		[stopPoll, syncPayment],
	);

	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);

	useEffect(() => () => stopPoll(), [stopPoll]);

	useEffect(() => {
		if (!payReturn || returnHandled.current) return;
		returnHandled.current = true;
		if (payReturn === "fail" || payReturn === "error" || payReturn === "cancelled") {
			setError("Оплата не завершена. Можно открыть Rahmat снова.");
			setAwaiting(true);
			return;
		}
		setAwaiting(true);
		void (async () => {
			await syncPayment();
			startPoll();
		})();
	}, [payReturn, startPoll, syncPayment]);

	useEffect(() => {
		function onVis() {
			if (document.visibilityState === "visible" && (awaiting || payment)) {
				void syncPayment();
			}
		}
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, [awaiting, payment, syncPayment]);

	async function createAndOpen() {
		if (expired) return;
		setBusy(true);
		setError("");
		try {
			const created = await clientApi<RahmatPayment>("/payments/rahmat/create", {
				method: "POST",
				body: JSON.stringify({ orderId }),
			});
			setPayment(created);
			const url = created.deeplinkUrl || created.payUrl;
			if (!url) {
				setError("Rahmat не вернул ссылку на оплату");
				return;
			}
			openExternalUrl(url);
			setAwaiting(true);
			startPoll(paymentIdOf(created));
		} catch (err) {
			setError(errorText(err, "Не удалось создать оплату Rahmat"));
		} finally {
			setBusy(false);
		}
	}

	function reopen() {
		const url = payment?.deeplinkUrl || payment?.payUrl;
		if (url) openExternalUrl(url);
		else void createAndOpen();
	}

	if (expired) return null;

	return (
		<div className="mt-5">
			<div className="rounded-2xl border border-orange/35 bg-orange/10 px-4 py-3.5 text-center">
				<p className="text-[11px] tracking-wide text-muted uppercase">Места удерживаются 10 мин</p>
				<p className="mt-1 font-mono text-[32px] font-bold text-orange tabular-nums">
					{formatCountdown(holdLeft)}
				</p>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
					<div
						className="h-full rounded-full bg-orange transition-[width] duration-1000"
						style={{ width: `${holdPct}%` }}
					/>
				</div>
			</div>

			{awaiting ? (
				<p className="mt-4 text-center text-[13px] text-muted">
					Ожидаем оплату в Rahmat… не закрывайте бронь.
				</p>
			) : (
				<p className="mt-4 text-center text-[13px] text-muted">
					Оплата через <b className="text-ink">Rahmat</b> · {formatPrice(amountUzs)}
				</p>
			)}

			{error ? <p className="mt-2 text-center text-xs text-bad">{error}</p> : null}

			<div className="mt-4 flex flex-col gap-2">
				<button
					className={cx(ui.cta, ui.ctaBlock)}
					type="button"
					disabled={busy}
					onClick={() =>
						void (payment?.payUrl || payment?.deeplinkUrl ? reopen() : createAndOpen())
					}
				>
					{busy
						? "…"
						: payment?.payUrl || payment?.deeplinkUrl
							? "Открыть Rahmat"
							: "Оплатить Rahmat"}
				</button>
				{awaiting ? (
					<button
						className={cx(ui.cta, ui.ctaBlock, ui.ctaGhost, "border border-line")}
						type="button"
						onClick={() => void syncPayment()}
					>
						Проверить оплату
					</button>
				) : null}
			</div>
		</div>
	);
}
