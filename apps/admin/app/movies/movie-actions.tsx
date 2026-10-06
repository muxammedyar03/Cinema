"use client";

import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clientApi } from "../../lib/api";
import { MovieEditDialog } from "./new-movie-action";

export function MovieRowActions({
	movie,
}: {
	movie: { id: string; title: string; status: "ACTIVE" | "ARCHIVED" };
}) {
	const router = useRouter();
	const rootRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const archived = movie.status === "ARCHIVED";

	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	async function archiveOrRestore() {
		setOpen(false);
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
		setOpen(false);
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

	const item =
		"flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-elev disabled:opacity-50";

	return (
		<div ref={rootRef} className="relative shrink-0">
			<button
				type="button"
				aria-label="Действия"
				aria-haspopup="menu"
				aria-expanded={open}
				disabled={busy}
				className="inline-flex size-10 items-center justify-center rounded-[9px] border border-line-strong bg-white text-ink hover:bg-elev disabled:opacity-50 dark:bg-gray-800"
				onClick={() => setOpen((value) => !value)}
			>
				<MoreVertical className="size-4" strokeWidth={2} />
			</button>
			{open ? (
				<div
					role="menu"
					className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg dark:bg-gray-800"
				>
					<button
						type="button"
						role="menuitem"
						className={item}
						onClick={() => {
							setOpen(false);
							setEditing(true);
						}}
					>
						<Pencil className="size-3.5" strokeWidth={2} />
						Изменить
					</button>
					<button
						type="button"
						role="menuitem"
						className={item}
						disabled={busy}
						onClick={() => void archiveOrRestore()}
					>
						{archived ? (
							<ArchiveRestore className="size-3.5" strokeWidth={2} />
						) : (
							<Archive className="size-3.5" strokeWidth={2} />
						)}
						{archived ? "Восстановить" : "Архив"}
					</button>
					<button
						type="button"
						role="menuitem"
						className={`${item} text-bad`}
						disabled={busy}
						onClick={() => void remove()}
					>
						<Trash2 className="size-3.5" strokeWidth={2} />
						Удалить
					</button>
				</div>
			) : null}
			{error ? <p className="absolute right-0 top-11 z-30 w-48 text-right text-[11px] text-bad">{error}</p> : null}
			<MovieEditDialog movieId={movie.id} open={editing} onClose={() => setEditing(false)} />
		</div>
	);
}
