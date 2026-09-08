"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

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
		<div className="flex flex-wrap items-center justify-end gap-2">
			<Link className={cx(ui.btn, ui.btnSm, ui.btnGhost)} href={`/movies/${movie.id}/edit`}>
				<Pencil className="size-3.5" strokeWidth={2} />
				Изменить
			</Link>
			<button
				className={cx(ui.btn, ui.btnSm, ui.btnGhost)}
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
			</button>
			<button
				className={cx(ui.btn, ui.btnSm, ui.btnWarn)}
				type="button"
				disabled={busy}
				onClick={remove}
			>
				<Trash2 className="size-3.5" strokeWidth={2} />
				Удалить
			</button>
			{error ? <span className="w-full text-right text-[11px] text-bad">{error}</span> : null}
		</div>
	);
}
