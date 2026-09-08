"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../../lib/api";
import { cx, ui } from "../../../lib/ui";

export function HallForm({ cinemaId, embedded = false }: { cinemaId: string; embedded?: boolean }) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [capacity, setCapacity] = useState(90);
	const [error, setError] = useState("");

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		try {
			await clientApi(`/admin/cinemas/${cinemaId}/halls`, {
				method: "POST",
				body: JSON.stringify({ name, capacity: Number(capacity) }),
			});
			setName("");
			router.refresh();
		} catch {
			setError("Не удалось создать зал.");
		}
	}

	const fields = (
		<>
			{error ? <p className={ui.err}>{error}</p> : null}
			<div className={ui.field}>
				<label className={ui.label} htmlFor="hall-name">
					Название
				</label>
				<input
					id="hall-name"
					className={ui.input}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Hall 1"
					required
				/>
			</div>
			<div className={ui.field}>
				<label className={ui.label} htmlFor="cap">
					Вместимость
				</label>
				<input
					id="cap"
					className={ui.input}
					type="number"
					min={1}
					value={capacity}
					onChange={(e) => setCapacity(Number(e.target.value))}
					required
				/>
			</div>
			<button className={cx(ui.btn, ui.btnPri)} type="submit">
				Добавить
			</button>
		</>
	);

	if (embedded) {
		return <form onSubmit={onSubmit}>{fields}</form>;
	}

	return (
		<form className={cx(ui.card, "max-w-[480px] p-[18px]")} onSubmit={onSubmit}>
			<div className={cx(ui.cardH, "border-0 px-0 pb-3 pt-0")}>Новый зал</div>
			{fields}
		</form>
	);
}
