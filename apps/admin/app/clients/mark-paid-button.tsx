"use client";

import { Button } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";

export function MarkInvoicePaidButton({ invoiceId }: { invoiceId: string }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	return (
		<span>
			<Button
				size="small"
				variant="secondary"
				disabled={busy}
				onClick={async () => {
					setBusy(true);
					setErr(null);
					try {
						await clientApi("/admin/billing/invoices/mark-paid", {
							method: "POST",
							body: JSON.stringify({ invoiceId }),
						});
						router.refresh();
					} catch (error) {
						setErr(errorText(error, "Не удалось отметить оплату"));
					} finally {
						setBusy(false);
					}
				}}
			>
				Оплачено
			</Button>
			{err ? <span>{err}</span> : null}
		</span>
	);
}
