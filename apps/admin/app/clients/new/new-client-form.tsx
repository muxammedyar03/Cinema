"use client";

import type { SessionUser } from "@cinema/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "../../../components/shell";
import { clientApi } from "../../../lib/api";
import { cx, ui } from "../../../lib/ui";

export function NewClientForm({ user }: { user: SessionUser }) {
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
		setForm((f) => ({ ...f, [key]: value }));
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
			router.push(`/clients/${cinema.id}`);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Не удалось создать клиента");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Новый клиент</h1>
					<p className={ui.sub}>Профиль кинотеатра · месячный план · первый Cinema Admin</p>
				</div>
				<Link className={cx(ui.btn, ui.btnGhost)} href="/clients">
					К списку
				</Link>
			</div>

			<form onSubmit={(e) => void onSubmit(e)} className="grid max-w-3xl gap-4">
				{error ? <p className={ui.err}>{error}</p> : null}

				<section className={ui.card}>
					<div className={ui.cardH}>Профиль</div>
					<div className="grid gap-3.5 p-[18px] sm:grid-cols-2">
						<div className={cx(ui.field, "sm:col-span-2")}>
							<label className={ui.label} htmlFor="name">
								Название *
							</label>
							<input
								id="name"
								className={ui.input}
								required
								value={form.name}
								onChange={(e) => set("name", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="address">
								Адрес
							</label>
							<input
								id="address"
								className={ui.input}
								value={form.address}
								onChange={(e) => set("address", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="phone">
								Телефон
							</label>
							<input
								id="phone"
								className={ui.input}
								value={form.phone}
								onChange={(e) => set("phone", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="timezone">
								Часовой пояс
							</label>
							<input
								id="timezone"
								className={ui.input}
								value={form.timezone}
								onChange={(e) => set("timezone", e.target.value)}
							/>
						</div>
						<div className={cx(ui.field, "sm:col-span-2")}>
							<label className={ui.label} htmlFor="description">
								Описание
							</label>
							<textarea
								id="description"
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
							<label className={ui.label} htmlFor="plan">
								План / месяц (сум) *
							</label>
							<input
								id="plan"
								type="number"
								min={1}
								className={ui.input}
								required
								value={form.monthlyPlanUzs}
								onChange={(e) => set("monthlyPlanUzs", Number(e.target.value))}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="commission">
								Комиссия / билет (пусто = default)
							</label>
							<input
								id="commission"
								type="number"
								min={0}
								className={ui.input}
								placeholder="500"
								value={form.commissionPerTicketUzs}
								onChange={(e) => set("commissionPerTicketUzs", e.target.value)}
							/>
						</div>
					</div>
				</section>

				<section className={ui.card}>
					<div className={ui.cardH}>Первый Cinema Admin</div>
					<div className="grid gap-3.5 p-[18px] sm:grid-cols-2">
						<div className={ui.field}>
							<label className={ui.label} htmlFor="adminEmail">
								Email *
							</label>
							<input
								id="adminEmail"
								type="email"
								className={ui.input}
								required
								value={form.adminEmail}
								onChange={(e) => set("adminEmail", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="adminPassword">
								Пароль * (мин. 8)
							</label>
							<input
								id="adminPassword"
								type="password"
								className={ui.input}
								required
								minLength={8}
								value={form.adminPassword}
								onChange={(e) => set("adminPassword", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="fn">
								Имя
							</label>
							<input
								id="fn"
								className={ui.input}
								value={form.adminFirstName}
								onChange={(e) => set("adminFirstName", e.target.value)}
							/>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="ln">
								Фамилия
							</label>
							<input
								id="ln"
								className={ui.input}
								value={form.adminLastName}
								onChange={(e) => set("adminLastName", e.target.value)}
							/>
						</div>
					</div>
				</section>

				<button className={cx(ui.btn, ui.btnPri)} type="submit" disabled={busy}>
					{busy ? "Создание…" : "Создать клиента"}
				</button>
			</form>
		</Shell>
	);
}
