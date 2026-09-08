"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export function BillingActions({
	cinemaId,
	invoiceId,
	status,
	invoiceStatus,
}: {
	cinemaId: string;
	invoiceId?: string;
	status: string;
	invoiceStatus?: string;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	async function markPaid() {
		if (!invoiceId) return;
		setBusy(true);
		setErr(null);
		try {
			await clientApi("/admin/billing/invoices/mark-paid", {
				method: "POST",
				body: JSON.stringify({ invoiceId }),
			});
			router.refresh();
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setBusy(false);
		}
	}

	async function unlock() {
		setBusy(true);
		setErr(null);
		try {
			await clientApi(`/admin/billing/cinemas/${cinemaId}/unlock`, { method: "POST" });
			router.refresh();
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<div className="flex flex-wrap justify-end gap-1.5">
				{invoiceId && invoiceStatus !== "PAID" ? (
					<button
						type="button"
						disabled={busy}
						className={cx(ui.btn, ui.btnSm, ui.btnGhost)}
						onClick={() => void markPaid()}
					>
						Оплачено
					</button>
				) : null}
				{status === "LOCKED" ? (
					<button
						type="button"
						disabled={busy}
						className={cx(ui.btn, ui.btnSm, ui.btnWarn)}
						onClick={() => void unlock()}
					>
						Разблок.
					</button>
				) : null}
			</div>
			{err ? <span className="max-w-[160px] text-[10px] text-bad">{err}</span> : null}
		</div>
	);
}
