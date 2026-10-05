"use client";

import { useEffect, useRef, useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import { clickInvoiceOutcome } from "../lib/click-invoice";
import { formatPrice } from "../lib/format";
import { openTelegramInvoice } from "../lib/telegram";
import type { OrderDetail } from "../lib/types";
import { BookingAction } from "./booking-action";

const POLL_MS = 1000;
const POLL_TRIES = 20;

export function ClickCheckout({
	orderId,
	amountUzs,
	onPaid,
}: {
	orderId: string;
	amountUzs?: number;
	onPaid: () => Promise<OrderDetail | undefined>;
}) {
	const [busy, setBusy] = useState(false);
	const [awaiting, setAwaiting] = useState(false);
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const stopRef = useRef(false);

	useEffect(() => {
		stopRef.current = false;
		return () => {
			stopRef.current = true;
		};
	}, []);

	async function waitUntilPaid() {
		setAwaiting(true);
		setInfo("Проверяем оплату…");
		try {
			for (let attempt = 0; attempt < POLL_TRIES; attempt++) {
				if (stopRef.current) return;
				const order = await onPaid();
				if (order?.status === "PAID") {
					setInfo("");
					setError("");
					return;
				}
				await new Promise((resolve) => setTimeout(resolve, POLL_MS));
			}
			setInfo("");
			setError("Оплата получена. Если билеты не появились, откройте заказ ещё раз.");
		} finally {
			setAwaiting(false);
		}
	}

	async function pay() {
		setBusy(true);
		setError("");
		setInfo("");
		try {
			const created = await clientApi<{ url: string }>(`/orders/${orderId}/telegram-invoice`, {
				method: "POST",
			});
			if (!created.url) {
				setError("Не удалось открыть оплату Click");
				return;
			}
			const opened = openTelegramInvoice(created.url, (status) => {
				const outcome = clickInvoiceOutcome(status);
				if (outcome.kind === "paid" || outcome.kind === "pending") {
					void waitUntilPaid();
					return;
				}
				setInfo("");
				setError(outcome.message);
			});
			if (!opened) {
				setError("Оплата через Click доступна только внутри Telegram.");
			}
		} catch (err) {
			setError(errorText(err, "Не удалось создать оплату Click"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="stack">
			{info ? <p className="note">{info}</p> : null}
			{error ? <p className="note bad">{error}</p> : null}
			<BookingAction
				summary={amountUzs ? formatPrice(amountUzs) : "Click"}
				label={amountUzs ? `Оплатить ${formatPrice(amountUzs)}` : "Оплатить через Click"}
				busy={busy || awaiting}
				onClick={() => void pay()}
			/>
		</div>
	);
}
