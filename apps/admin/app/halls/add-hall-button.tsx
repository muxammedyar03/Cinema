"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export function AddHallButton({ cinemaId }: { cinemaId: string }) {
	const router = useRouter();
	const titleId = useId();
	const nameId = useId();
	const capId = useId();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [capacity, setCapacity] = useState(90);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

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
			<button className={cx(ui.btn, ui.btnPri)} type="button" onClick={() => setOpen(true)}>
				<Plus className="size-4" strokeWidth={2} />
				Новый зал
			</button>

			{open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 border-0 bg-black/45"
						aria-label="Закрыть"
						onClick={() => setOpen(false)}
					/>
					<div
						className="relative z-10 w-full max-w-[420px] rounded-xl border border-line bg-surface p-5 shadow-xl"
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
					>
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<h2 id={titleId} className="font-brand text-lg font-bold">
									Новый зал
								</h2>
								<p className="mt-1 text-[13px] text-muted">Название и вместимость, затем схема</p>
							</div>
							<button
								type="button"
								className="grid size-8 place-items-center rounded-lg text-muted hover:bg-elev hover:text-ink"
								aria-label="Закрыть"
								onClick={() => setOpen(false)}
							>
								<X className="size-4" strokeWidth={2} />
							</button>
						</div>
						<form onSubmit={onSubmit}>
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
									placeholder="Hall 1"
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
							<div className="mt-2 flex justify-end gap-2">
								<button
									className={cx(ui.btn, ui.btnGhost)}
									type="button"
									onClick={() => setOpen(false)}
								>
									Отмена
								</button>
								<button className={cx(ui.btn, ui.btnPri)} type="submit" disabled={busy}>
									{busy ? "…" : "Добавить"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</>
	);
}
