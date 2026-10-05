"use client";

import { Button } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "../../../components/platform/button-link";
import styles from "../../../components/platform/platform.module.css";
import { clientApi } from "../../../lib/api";
import { errorText } from "../../../lib/api-error";

export function InvoiceRowActions({
	invoiceId,
	status,
	cinemaId,
	unlock = false,
}: {
	invoiceId: string;
	status: string;
	cinemaId: string;
	unlock?: boolean;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	async function payRahmat() {
		setBusy(true);
		setErr(null);
		try {
			const result = await clientApi<{ payUrl?: string; deeplinkUrl?: string }>(
				`/admin/billing/invoices/${invoiceId}/rahmat`,
				{ method: "POST" },
			);
			const url = result.payUrl;
			if (!url) throw new Error("Платёж обрабатывается; обратитесь в поддержку");
			window.location.assign(url);
		} catch (error) {
			setErr(errorText(error, "Не удалось открыть Rahmat"));
		} finally {
			setBusy(false);
		}
	}

	async function markPaid() {
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
	}

	async function unlockCinema() {
		setBusy(true);
		setErr(null);
		try {
			await clientApi(`/admin/billing/cinemas/${cinemaId}/unlock`, { method: "POST" });
			router.refresh();
		} catch (error) {
			setErr(errorText(error, "Не удалось разблокировать"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className={styles.actions}>
			<ButtonLink href={`/clients/${cinemaId}`} variant="secondary" size="small">
				Кинотеатр
			</ButtonLink>
			{status !== "PAID" && status !== "VOID" ? (
				<>
					<Button size="small" disabled={busy} onClick={() => void payRahmat()}>
						Оплатить Rahmat
					</Button>
					<Button size="small" disabled={busy} onClick={() => void markPaid()}>
						Оплачено
					</Button>
				</>
			) : null}
			{unlock ? (
				<Button
					variant="secondary"
					size="small"
					className={styles.danger}
					disabled={busy}
					onClick={() => void unlockCinema()}
				>
					Разблокировать
				</Button>
			) : null}
			{err ? <span className={styles.sub}>{err}</span> : null}
		</div>
	);
}
