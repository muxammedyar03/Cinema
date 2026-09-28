"use client";

import type { SessionUser } from "@cinema/types";
import { Button, Card, CardHeader, PageHeader } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "../../../../components/platform/button-link";
import fields from "../../../../components/platform/fields.module.css";
import { Shell } from "../../../../components/shell";
import { clientApi } from "../../../../lib/api";
import { errorText } from "../../../../lib/api-error";

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
		setForm((current) => ({ ...current, [key]: value }));
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
			setError(errorText(err, "Не удалось сохранить"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Shell user={user}>
			<PageHeader
				title={`Редактировать · ${initial.name}`}
				description="Профиль и настройки подписки"
				actions={
					<ButtonLink href={`/clients/${initial.id}`} variant="secondary">
						Назад
					</ButtonLink>
				}
			/>

			<form onSubmit={(e) => void onSubmit(e)} className={fields.form}>
				{error ? <p className={fields.error}>{error}</p> : null}
				{msg ? <p className={fields.ok}>{msg}</p> : null}

				<Card>
					<CardHeader title="Профиль" />
					<div className={fields.sectionGrid}>
						<label className={`${fields.field} ${fields.span2}`} htmlFor="edit-client-name">
							<span className={fields.label}>Название *</span>
							<input
								id="edit-client-name"
								className={fields.input}
								required
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="edit-client-address">
							<span className={fields.label}>Адрес</span>
							<input
								id="edit-client-address"
								className={fields.input}
								value={form.address}
								onChange={(e) => set("address", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="edit-client-phone">
							<span className={fields.label}>Телефон</span>
							<input
								id="edit-client-phone"
								className={fields.input}
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="edit-client-tz">
							<span className={fields.label}>Часовой пояс</span>
							<input
								id="edit-client-tz"
								className={fields.input}
								value={form.timezone}
								onChange={(e) => set("timezone", e.target.value)}
							/>
						</label>
						<label className={`${fields.field} ${fields.span2}`} htmlFor="edit-client-desc">
							<span className={fields.label}>Описание</span>
							<textarea
								id="edit-client-desc"
								className={fields.textarea}
								value={form.description}
								onChange={(e) => set("description", e.target.value)}
							/>
						</label>
					</div>
				</Card>

				<Card>
					<CardHeader title="Подписка" />
					<div className={fields.sectionGrid}>
						<label className={fields.field} htmlFor="edit-client-plan">
							<span className={fields.label}>План / месяц (сум)</span>
							<input
								id="edit-client-plan"
								type="number"
								min={1}
								className={fields.input}
								value={form.monthlyPlanUzs}
								onChange={(e) => set("monthlyPlanUzs", Number(e.target.value))}
							/>
						</label>
						<label className={fields.field} htmlFor="edit-client-commission">
							<span className={fields.label}>Комиссия / билет (пусто — по умолчанию)</span>
							<input
								id="edit-client-commission"
								type="number"
								min={0}
								className={fields.input}
								value={form.commissionPerTicketUzs}
								onChange={(e) => set("commissionPerTicketUzs", e.target.value)}
							/>
						</label>
					</div>
				</Card>

				<Button type="submit" disabled={busy}>
					{busy ? "Сохранение…" : "Сохранить"}
				</Button>
			</form>
		</Shell>
	);
}
