"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../../lib/api";
import { cx, ui } from "../../../lib/ui";

type Settings = {
	defaultCommissionUzs: number;
	lockAfterDays: number;
	notifyHourTashkent: number;
	notifyTelegram: boolean;
	notifyApp: boolean;
	lateMessageTemplate: string;
};

export function SettingsForm({ initial }: { initial: Settings }) {
	const router = useRouter();
	const [form, setForm] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);

	async function save(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setMsg(null);
		setErr(null);
		try {
			await clientApi("/admin/billing/settings", {
				method: "PATCH",
				body: JSON.stringify(form),
			});
			setMsg("Сохранено");
			router.refresh();
		} catch (error) {
			setErr(error instanceof Error ? error.message : "Ошибка");
		} finally {
			setBusy(false);
		}
	}

	return (
		<form onSubmit={(e) => void save(e)} className="grid max-w-2xl gap-4 sm:grid-cols-2">
			<label className={ui.field}>
				<span className={ui.label}>Default комиссия / билет (сум)</span>
				<input
					className={ui.input}
					type="number"
					min={0}
					value={form.defaultCommissionUzs}
					onChange={(e) => setForm((f) => ({ ...f, defaultCommissionUzs: Number(e.target.value) }))}
				/>
			</label>
			<label className={ui.field}>
				<span className={ui.label}>Дней до авто-lock</span>
				<input
					className={ui.input}
					type="number"
					min={1}
					max={90}
					value={form.lockAfterDays}
					onChange={(e) => setForm((f) => ({ ...f, lockAfterDays: Number(e.target.value) }))}
				/>
			</label>
			<label className={ui.field}>
				<span className={ui.label}>Час рассылки (Asia/Tashkent)</span>
				<input
					className={ui.input}
					type="number"
					min={0}
					max={23}
					value={form.notifyHourTashkent}
					onChange={(e) => setForm((f) => ({ ...f, notifyHourTashkent: Number(e.target.value) }))}
				/>
			</label>
			<div className={ui.field}>
				<span className={ui.label}>Каналы</span>
				<label className="mt-2 flex items-center gap-2 text-sm text-ink">
					<input
						type="checkbox"
						checked={form.notifyTelegram}
						onChange={(e) => setForm((f) => ({ ...f, notifyTelegram: e.target.checked }))}
					/>
					Telegram
				</label>
				<label className="mt-1.5 flex items-center gap-2 text-sm text-ink">
					<input
						type="checkbox"
						checked={form.notifyApp}
						onChange={(e) => setForm((f) => ({ ...f, notifyApp: e.target.checked }))}
					/>
					In-app
				</label>
			</div>
			<label className={cx(ui.field, "sm:col-span-2")}>
				<span className={ui.label}>
					Шаблон (&#123;&#123;days&#125;&#125;, &#123;&#123;invoice&#125;&#125;,
					&#123;&#123;left&#125;&#125;)
				</span>
				<textarea
					className={cx(ui.input, "min-h-[100px]")}
					value={form.lateMessageTemplate}
					onChange={(e) => setForm((f) => ({ ...f, lateMessageTemplate: e.target.value }))}
				/>
			</label>
			<div className="sm:col-span-2 flex flex-wrap items-center gap-3">
				<button type="submit" disabled={busy} className={cx(ui.btn, ui.btnPri)}>
					{busy ? "…" : "Сохранить"}
				</button>
				{msg ? <span className={ui.okMsg}>{msg}</span> : null}
				{err ? <span className={ui.err}>{err}</span> : null}
			</div>
		</form>
	);
}
