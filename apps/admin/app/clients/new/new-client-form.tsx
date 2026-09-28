"use client";

import type { SessionUser } from "@cinema/types";
import { Button, Card, CardHeader, PageHeader } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "../../../components/platform/button-link";
import fields from "../../../components/platform/fields.module.css";
import { Shell } from "../../../components/shell";
import { clientApi } from "../../../lib/api";
import { errorText } from "../../../lib/api-error";

export function NewClientForm({
	user,
	cancelHref = "/clients",
}: {
	user: SessionUser;
	cancelHref?: string;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [form, setForm] = useState({
		name: "",
		address: "",
		phone: "",
		description: "",
		timezone: "Asia/Tashkent",
		monthlyPlanUzs: 2_500_000,
		commissionPerTicketUzs: "" as string,
		adminEmail: "",
		adminPassword: "",
		adminFirstName: "",
		adminLastName: "",
	});

	function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError("");
		try {
			const cinema = await clientApi<{ id: string }>("/admin/cinemas", {
				method: "POST",
				body: JSON.stringify({
					name: form.name,
					address: form.address || undefined,
					phone: form.phone || undefined,
					description: form.description || undefined,
					timezone: form.timezone,
					monthlyPlanUzs: Number(form.monthlyPlanUzs),
					commissionPerTicketUzs:
						form.commissionPerTicketUzs === "" ? null : Number(form.commissionPerTicketUzs),
					admin: {
						email: form.adminEmail,
						password: form.adminPassword,
						firstName: form.adminFirstName || undefined,
						lastName: form.adminLastName || undefined,
					},
				}),
			});
			router.push(`/clients/${cinema.id}/profile`);
			router.refresh();
		} catch (err) {
			setError(errorText(err, "Не удалось создать кинотеатр"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Shell user={user}>
			<PageHeader
				title="Новый кинотеатр"
				description="Профиль, месячный план и первый администратор"
				actions={
					<ButtonLink href={cancelHref} variant="secondary">
						К списку
					</ButtonLink>
				}
			/>

			<form onSubmit={(e) => void onSubmit(e)} className={fields.form}>
				{error ? <p className={fields.error}>{error}</p> : null}

				<Card>
					<CardHeader title="Профиль" />
					<div className={fields.sectionGrid}>
						<label className={`${fields.field} ${fields.span2}`} htmlFor="name">
							<span className={fields.label}>Название *</span>
							<input
								id="name"
								className={fields.input}
								required
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="address">
							<span className={fields.label}>Адрес</span>
							<input
								id="address"
								className={fields.input}
								value={form.address}
								onChange={(e) => set("address", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="phone">
							<span className={fields.label}>Телефон</span>
							<input
								id="phone"
								className={fields.input}
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="timezone">
							<span className={fields.label}>Часовой пояс</span>
							<input
								id="timezone"
								className={fields.input}
								value={form.timezone}
								onChange={(e) => set("timezone", e.target.value)}
							/>
						</label>
						<label className={`${fields.field} ${fields.span2}`} htmlFor="description">
							<span className={fields.label}>Описание</span>
							<textarea
								id="description"
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
						<label className={fields.field} htmlFor="plan">
							<span className={fields.label}>План / месяц (сум) *</span>
							<input
								id="plan"
								type="number"
								min={1}
								className={fields.input}
								required
								value={form.monthlyPlanUzs}
								onChange={(e) => set("monthlyPlanUzs", Number(e.target.value))}
							/>
						</label>
						<label className={fields.field} htmlFor="commission">
							<span className={fields.label}>Комиссия / билет (пусто — по умолчанию)</span>
							<input
								id="commission"
								type="number"
								min={0}
								className={fields.input}
								value={form.commissionPerTicketUzs}
								onChange={(e) => set("commissionPerTicketUzs", e.target.value)}
							/>
						</label>
					</div>
				</Card>

				<Card>
					<CardHeader title="Первый администратор" />
					<div className={fields.sectionGrid}>
						<label className={fields.field} htmlFor="adminEmail">
							<span className={fields.label}>Электронная почта *</span>
							<input
								id="adminEmail"
								type="email"
								className={fields.input}
								required
								value={form.adminEmail}
								onChange={(e) => set("adminEmail", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="adminPassword">
							<span className={fields.label}>Пароль * (минимум 8 символов)</span>
							<input
								id="adminPassword"
								type="password"
								className={fields.input}
								required
								minLength={8}
								value={form.adminPassword}
								onChange={(e) => set("adminPassword", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="fn">
							<span className={fields.label}>Имя</span>
							<input
								id="fn"
								className={fields.input}
								value={form.adminFirstName}
								onChange={(e) => set("adminFirstName", e.target.value)}
							/>
						</label>
						<label className={fields.field} htmlFor="ln">
							<span className={fields.label}>Фамилия</span>
							<input
								id="ln"
								className={fields.input}
								value={form.adminLastName}
								onChange={(e) => set("adminLastName", e.target.value)}
							/>
						</label>
					</div>
				</Card>

				<Button type="submit" disabled={busy}>
					{busy ? "Создание…" : "Создать кинотеатр"}
				</Button>
			</form>
		</Shell>
	);
}
