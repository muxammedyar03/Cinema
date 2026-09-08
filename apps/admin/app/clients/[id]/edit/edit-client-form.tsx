"use client";

import type { SessionUser } from "@cinema/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "../../../../components/shell";
import { clientApi } from "../../../../lib/api";
import { cx, ui } from "../../../../lib/ui";

type Initial = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	description: string | null;
	timezone: string;
	billing: {
		monthlyPlanUzs: number;
		commissionPerTicketUzs: number;
		commissionIsOverride: boolean;
	};
};

export function EditClientForm({ user, initial }: { user: SessionUser; initial: Initial }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [msg, setMsg] = useState("");
	const [form, setForm] = useState({
		name: initial.name,
		address: initial.address ?? "",
		phone: initial.phone ?? "",
		description: initial.description ?? "",
		timezone: initial.timezone,
		monthlyPlanUzs: initial.billing.monthlyPlanUzs,
		commissionPerTicketUzs: initial.billing.commissionIsOverride
			? String(initial.billing.commissionPerTicketUzs)
			: "",
	});

	function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError("");
		setMsg("");
		try {
			await clientApi(`/admin/cinemas/${initial.id}/client`, {
				method: "PATCH",
				body: JSON.stringify({
					name: form.name,
					address: form.address || null,
					phone: form.phone || null,
					description: form.description || null,
					timezone: form.timezone,
					monthlyPlanUzs: Number(form.monthlyPlanUzs),
					commissionPerTicketUzs:
						form.commissionPerTicketUzs === "" ? null : Number(form.commissionPerTicketUzs),
				}),
			});
			setMsg("Сохранено");
			router.push(`/clients/${initial.id}`);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Редактировать · {initial.name}</h1>
					<p className={ui.sub}>Профиль и биллинг-настройки клиента</p>
				</div>
				<Link className={cx(ui.btn, ui.btnGhost)} href={`/clients/${initial.id}`}>
					Назад
				</Link>
			</div>

			<form onSubmit={(e) => void onSubmit(e)} className="grid max-w-3xl gap-4">
				{error ? <p className={ui.err}>{error}</p> : null}
				{msg ? <p className={ui.okMsg}>{msg}</p> : null}

				<section className={ui.card}>
					<div className={ui.cardH}>Профиль</div>
					<div className="grid gap-3.5 p-[18px] sm:grid-cols-2">
						<div className={cx(ui.field, "sm:col-span-2")}>
							<label className={ui.label} htmlFor="edit-client-name">
								Название *
							</label>
							<input
								id="edit-client-name"
								className={ui.input}
								required
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="edit-client-address">
								Адрес
							</label>
							<input
								id="edit-client-address"
								className={ui.input}
								value={form.address}
								onChange={(e) => set("address", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="edit-client-phone">
								Телефон
							</label>
							<input
								id="edit-client-phone"
								className={ui.input}
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="edit-client-tz">
								Часовой пояс
							</label>
							<input
								id="edit-client-tz"
								className={ui.input}
								value={form.timezone}
								onChange={(e) => set("timezone", e.target.value)}
							/>
						</div>
						<div className={cx(ui.field, "sm:col-span-2")}>
							<label className={ui.label} htmlFor="edit-client-desc">
								Описание
							</label>
							<textarea
								id="edit-client-desc"
								className={cx(ui.input, "min-h-[80px]")}
								value={form.description}
								onChange={(e) => set("description", e.target.value)}
							/>
						</div>
					</div>
				</section>

				<section className={ui.card}>
					<div className={ui.cardH}>Биллинг</div>
					<div className="grid gap-3.5 p-[18px] sm:grid-cols-2">
						<div className={ui.field}>
							<label className={ui.label} htmlFor="edit-client-plan">
								План / месяц (сум)
							</label>
							<input
								id="edit-client-plan"
								type="number"
								min={1}
								className={ui.input}
								value={form.monthlyPlanUzs}
								onChange={(e) => set("monthlyPlanUzs", Number(e.target.value))}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="edit-client-commission">
								Комиссия / билет (пусто = default)
							</label>
							<input
								id="edit-client-commission"
								type="number"
								min={0}
								className={ui.input}
								value={form.commissionPerTicketUzs}
								onChange={(e) => set("commissionPerTicketUzs", e.target.value)}
							/>
						</div>
					</div>
				</section>

				<button className={cx(ui.btn, ui.btnPri)} type="submit" disabled={busy}>
					{busy ? "…" : "Сохранить"}
				</button>
			</form>
		</Shell>
	);
}
