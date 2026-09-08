"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export function MarkInvoicePaidButton({ invoiceId }: { invoiceId: string }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);

	return (
		<button
			type="button"
			disabled={busy}
			className={cx(ui.btn, ui.btnSm, ui.btnGhost)}
			onClick={async () => {
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
			}}
		>
			Оплачено
		</button>
	);
}
