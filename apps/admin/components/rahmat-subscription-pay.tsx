"use client";
import { Button } from "@cinema/ui";
import { useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
export function RahmatSubscriptionPay({ invoiceId }: { invoiceId: string }) {
	const [busy, setBusy] = useState(false),
		[error, setError] = useState("");
	async function pay() {
		setBusy(true);
		setError("");
		try {
			const result = await clientApi<{ payUrl?: string }>(
				`/admin/billing/invoices/${invoiceId}/rahmat`,
				{ method: "POST" },
			);
			if (!result.payUrl) throw new Error("Платёж обрабатывается; обратитесь в поддержку");
			window.location.assign(result.payUrl);
		} catch (e) {
			setError(errorText(e, "Не удалось открыть Rahmat"));
		} finally {
			setBusy(false);
		}
	}
	return (
		<div>
			<Button disabled={busy} onClick={() => void pay()}>
				Оплатить подписку Rahmat
			</Button>
			{error ? <p role="alert">{error}</p> : null}
		</div>
	);
}
