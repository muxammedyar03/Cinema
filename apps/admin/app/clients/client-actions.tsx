"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export function ClientActions({
	clientId,
	status,
}: {
	clientId: string;
	status: "ACTIVE" | "DISABLED" | "LOCKED";
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	async function setStatus(next: "ACTIVE" | "DISABLED") {
		setBusy(true);
		setErr(null);
		try {
			await clientApi(`/admin/cinemas/${clientId}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status: next }),
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
			await clientApi(`/admin/billing/cinemas/${clientId}/unlock`, { method: "POST" });
			router.refresh();
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setBusy(false);
		}
	}

	async function remove() {
		if (
			!confirm(
				"Удалить клиента безвозвратно? Если есть заказы — удаление будет отклонено. Рекомендуется блокировка.",
			)
		) {
			return;
		}
		setBusy(true);
		setErr(null);
		try {
			await clientApi(`/admin/cinemas/${clientId}`, { method: "DELETE" });
			router.push("/clients");
			router.refresh();
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Ошибка удаления");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex flex-col items-end gap-2">
			<div className="flex flex-wrap justify-end gap-2">
				<Link className={cx(ui.btn, ui.btnGhost)} href={`/clients/${clientId}/edit`}>
					Редактировать
				</Link>
				{status === "LOCKED" ? (
					<button
						type="button"
						disabled={busy}
						className={cx(ui.btn, ui.btnWarn)}
						onClick={() => void unlock()}
					>
						Разблокировать
					</button>
				) : null}
				{status === "ACTIVE" ? (
					<button
						type="button"
						disabled={busy}
						className={cx(ui.btn, ui.btnWarn)}
						onClick={() => void setStatus("DISABLED")}
					>
						Заблокировать
					</button>
				) : null}
				{status === "DISABLED" ? (
					<button
						type="button"
						disabled={busy}
						className={cx(ui.btn, ui.btnPri)}
						onClick={() => void setStatus("ACTIVE")}
					>
						Разблокировать
					</button>
				) : null}
				<button
					type="button"
					disabled={busy}
					className={cx(ui.btn, ui.btnGhost, "text-bad hover:border-bad")}
					onClick={() => void remove()}
				>
					Удалить
				</button>
			</div>
			{err ? <p className="max-w-md text-right text-[12px] text-bad">{err}</p> : null}
		</div>
	);
}
