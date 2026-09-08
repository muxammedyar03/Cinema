"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../../lib/api";
import { cx, ui } from "../../../lib/ui";

export function InvoiceRowActions({
	invoiceId,
	status,
	cinemaId,
}: {
	invoiceId: string;
	status: string;
	cinemaId: string;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);

	async function markPaid() {
		setBusy(true);
		try {
			await clientApi("/admin/billing/invoices/mark-paid", {
				method: "POST",
				body: JSON.stringify({ invoiceId }),
			});
			router.refresh();
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex flex-wrap justify-end gap-1.5">
			<Link className={cx(ui.btn, ui.btnSm, ui.btnGhost)} href={`/clients/${cinemaId}`}>
				Клиент
			</Link>
			{status !== "PAID" && status !== "VOID" ? (
				<button
					type="button"
					disabled={busy}
					className={cx(ui.btn, ui.btnSm, ui.btnPri)}
					onClick={() => void markPaid()}
				>
					Оплачено
				</button>
			) : null}
		</div>
	);
}
