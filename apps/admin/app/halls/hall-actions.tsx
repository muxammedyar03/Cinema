"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export function HallRowActions({
	cinemaId,
	hall,
}: {
	cinemaId: string;
	hall: { id: string; name: string; capacity: number };
}) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(hall.name);
	const [capacity, setCapacity] = useState(hall.capacity);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function save() {
		setBusy(true);
		setError("");
		try {
			await clientApi(`/admin/cinemas/${cinemaId}/halls/${hall.id}`, {
				method: "PATCH",
				body: JSON.stringify({ name, capacity: Number(capacity) }),
			});
			setEditing(false);
			router.refresh();
		} catch {
			setError("Не удалось сохранить");
		} finally {
			setBusy(false);
		}
	}

	async function remove() {
		if (!confirm(`Удалить зал «${hall.name}»?`)) return;
		setBusy(true);
		setError("");
		try {
			await clientApi(`/admin/cinemas/${cinemaId}/halls/${hall.id}`, { method: "DELETE" });
			router.refresh();
		} catch {
			setError("Нельзя удалить: есть сеансы или ошибка API");
		} finally {
			setBusy(false);
		}
	}

	if (editing) {
		return (
			<div className="flex flex-wrap items-center justify-end gap-2">
				<input
					className={cx(ui.input, "h-8 w-28 py-1 text-xs")}
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<input
					className={cx(ui.input, "h-8 w-20 py-1 text-xs")}
					type="number"
					min={1}
					value={capacity}
					onChange={(e) => setCapacity(Number(e.target.value))}
				/>
				<button
					className={cx(ui.btn, ui.btnSm, ui.btnPri)}
					type="button"
					disabled={busy}
					onClick={save}
				>
					ОК
				</button>
				<button
					className={cx(ui.btn, ui.btnSm, ui.btnGhost)}
					type="button"
					onClick={() => setEditing(false)}
				>
					Отмена
				</button>
				{error ? <span className="w-full text-right text-[11px] text-bad">{error}</span> : null}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			<button
				className={cx(ui.btn, ui.btnSm, ui.btnGhost)}
				type="button"
				onClick={() => setEditing(true)}
			>
				<Pencil className="size-3.5" strokeWidth={2} />
				Изменить
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
