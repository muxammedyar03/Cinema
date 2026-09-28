"use client";

import { Button } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import fields from "../../../components/platform/fields.module.css";
import { clientApi } from "../../../lib/api";
import { errorText } from "../../../lib/api-error";

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
			setErr(errorText(error, "Не удалось сохранить"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<form onSubmit={(e) => void save(e)} className={fields.sectionGrid}>
			<label className={fields.field}>
				<span className={fields.label}>Комиссия по умолчанию / билет (сум)</span>
				<input
					className={fields.input}
					type="number"
					min={0}
					value={form.defaultCommissionUzs}
					onChange={(e) =>
						setForm((current) => ({ ...current, defaultCommissionUzs: Number(e.target.value) }))
					}
				/>
			</label>
			<label className={fields.field}>
				<span className={fields.label}>Дней до автоблокировки</span>
				<input
					className={fields.input}
					type="number"
					min={1}
					max={90}
					value={form.lockAfterDays}
					onChange={(e) =>
						setForm((current) => ({ ...current, lockAfterDays: Number(e.target.value) }))
					}
				/>
			</label>
			<label className={fields.field}>
				<span className={fields.label}>Час рассылки (Asia/Tashkent)</span>
				<input
					className={fields.input}
					type="number"
					min={0}
					max={23}
					value={form.notifyHourTashkent}
					onChange={(e) =>
						setForm((current) => ({ ...current, notifyHourTashkent: Number(e.target.value) }))
					}
				/>
			</label>
			<div className={fields.field}>
				<span className={fields.label}>Каналы</span>
				<label className={fields.check}>
					<input
						type="checkbox"
						checked={form.notifyTelegram}
						onChange={(e) =>
							setForm((current) => ({ ...current, notifyTelegram: e.target.checked }))
						}
					/>
					Telegram
				</label>
				<label className={fields.check}>
					<input
						type="checkbox"
						checked={form.notifyApp}
						onChange={(e) => setForm((current) => ({ ...current, notifyApp: e.target.checked }))}
					/>
					В приложении
				</label>
			</div>
			<label className={`${fields.field} ${fields.span2}`}>
				<span className={fields.label}>
					Шаблон ({"{{days}}"}, {"{{invoice}}"}, {"{{left}}"})
				</span>
				<textarea
					className={fields.textarea}
					value={form.lateMessageTemplate}
					onChange={(e) =>
						setForm((current) => ({ ...current, lateMessageTemplate: e.target.value }))
					}
				/>
			</label>
			<div className={`${fields.actions} ${fields.span2}`}>
				<Button type="submit" disabled={busy}>
					{busy ? "Сохранение…" : "Сохранить"}
				</Button>
				{msg ? <span className={fields.ok}>{msg}</span> : null}
				{err ? <span className={fields.error}>{err}</span> : null}
			</div>
		</form>
	);
}
