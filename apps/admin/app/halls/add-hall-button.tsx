"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { clientApi } from "../../lib/api";
import { ui } from "../../lib/ui";
import { Button, Dialog } from "../../lib/ui-kit";

export function AddHallButton({ cinemaId }: { cinemaId: string }) {
	const router = useRouter();
	const formId = useId();
	const nameId = useId();
	const capId = useId();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [capacity, setCapacity] = useState(90);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError("");
		try {
			await clientApi(`/admin/cinemas/${cinemaId}/halls`, {
				method: "POST",
				body: JSON.stringify({ name, capacity: Number(capacity) }),
			});
			setOpen(false);
			setName("");
			setCapacity(90);
			router.refresh();
		} catch {
			setError("Не удалось создать зал.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<Button type="button" onClick={() => setOpen(true)}>
				<Plus className="size-4" strokeWidth={2} />
				Новый зал
			</Button>
			<Dialog
				open={open}
				title="Новый зал"
				onClose={() => setOpen(false)}
				actions={
					<>
						<Button variant="secondary" type="button" onClick={() => setOpen(false)}>
							Отмена
						</Button>
						<Button type="submit" form={formId} disabled={busy}>
							{busy ? "Сохранение…" : "Добавить"}
						</Button>
					</>
				}
			>
				<p className="m-0 text-[13px] text-muted">Название и вместимость, затем схема мест.</p>
				<form id={formId} onSubmit={onSubmit}>
					{error ? <p className={ui.err}>{error}</p> : null}
					<div className={ui.field}>
						<label className={ui.label} htmlFor={nameId}>
							Название
						</label>
						<input
							id={nameId}
							className={ui.input}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Зал 1"
							required
						/>
					</div>
					<div className={ui.field}>
						<label className={ui.label} htmlFor={capId}>
							Вместимость
						</label>
						<input
							id={capId}
							className={ui.input}
							type="number"
							min={1}
							value={capacity}
							onChange={(e) => setCapacity(Number(e.target.value))}
							required
						/>
					</div>
				</form>
			</Dialog>
		</>
	);
}
