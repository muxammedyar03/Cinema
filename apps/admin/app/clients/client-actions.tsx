"use client";

import { Button } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "../../components/platform/button-link";
import styles from "../../components/platform/platform.module.css";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";

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
		} catch (error) {
			setErr(errorText(error, "Не удалось изменить статус"));
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
		} catch (error) {
			setErr(errorText(error, "Не удалось разблокировать"));
		} finally {
			setBusy(false);
		}
	}

	async function remove() {
		if (
			!confirm(
				"Удалить кинотеатр безвозвратно? Если есть заказы — удаление будет отклонено. Рекомендуется блокировка.",
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
		} catch (error) {
			setErr(errorText(error, "Не удалось удалить"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className={styles.actions}>
			<ButtonLink href={`/clients/${clientId}/profile`} variant="secondary" size="small">
				Профиль
			</ButtonLink>
			<ButtonLink href={`/clients/${clientId}/edit`} variant="secondary" size="small">
				Редактировать
			</ButtonLink>
			{status === "LOCKED" ? (
				<Button variant="secondary" size="small" disabled={busy} onClick={() => void unlock()}>
					Разблокировать
				</Button>
			) : null}
			{status === "ACTIVE" ? (
				<Button
					variant="secondary"
					size="small"
					className={styles.danger}
					disabled={busy}
					onClick={() => void setStatus("DISABLED")}
				>
					Заблокировать
				</Button>
			) : null}
			{status === "DISABLED" ? (
				<Button size="small" disabled={busy} onClick={() => void setStatus("ACTIVE")}>
					Включить
				</Button>
			) : null}
			<Button
				variant="secondary"
				size="small"
				className={styles.danger}
				disabled={busy}
				onClick={() => void remove()}
			>
				Удалить
			</Button>
			{err ? <p className={styles.sub}>{err}</p> : null}
		</div>
	);
}
