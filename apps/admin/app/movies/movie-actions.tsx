"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "../../components/button-link";
import { clientApi } from "../../lib/api";
import { Button } from "../../lib/ui-kit";

export function MovieRowActions({
	movie,
}: {
	movie: { id: string; title: string; status: "ACTIVE" | "ARCHIVED" };
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const archived = movie.status === "ARCHIVED";

	async function archiveOrRestore() {
		setBusy(true);
		setError("");
		try {
			await clientApi(`/admin/movies/${movie.id}/${archived ? "restore" : "archive"}`, {
				method: "POST",
			});
			router.refresh();
		} catch {
			setError("Не удалось изменить статус");
		} finally {
			setBusy(false);
		}
	}

	async function remove() {
		if (!confirm(`Удалить фильм «${movie.title}»?`)) return;
		setBusy(true);
		setError("");
		try {
			await clientApi(`/admin/movies/${movie.id}`, { method: "DELETE" });
			router.refresh();
		} catch {
			setError("Нельзя удалить: есть сеансы — сначала архив");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<ButtonLink href={`/movies/${movie.id}/edit`} variant="secondary" size="small">
				<Pencil className="size-3.5" strokeWidth={2} />
				Изменить
			</ButtonLink>
			<Button
				size="small"
				variant="secondary"
				type="button"
				disabled={busy}
				onClick={archiveOrRestore}
			>
				{archived ? (
					<ArchiveRestore className="size-3.5" strokeWidth={2} />
				) : (
					<Archive className="size-3.5" strokeWidth={2} />
				)}
				{archived ? "Восстановить" : "Архив"}
			</Button>
			<Button size="small" variant="danger" type="button" disabled={busy} onClick={remove}>
				<Trash2 className="size-3.5" strokeWidth={2} />
				Удалить
			</Button>
			{error ? <span className="w-full text-[11px] text-bad">{error}</span> : null}
		</div>
	);
}
