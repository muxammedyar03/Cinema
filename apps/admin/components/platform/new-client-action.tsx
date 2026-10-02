"use client";

import { Wizard, type WizardStep, WizardSummary } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";
import { formatMoneyUzs } from "../../lib/platform/format";
import { CreateAction, CreateBanner } from "../create-action";
import fields from "./fields.module.css";

type Draft = {
	name: string;
	address: string;
	phone: string;
	timezone: string;
	description: string;
	monthlyPlanUzs: string;
	commissionPerTicketUzs: string;
	adminEmail: string;
	adminPassword: string;
	adminFirstName: string;
	adminLastName: string;
};

const EMPTY: Draft = {
	name: "",
	address: "",
	phone: "",
	timezone: "Asia/Tashkent",
	description: "",
	monthlyPlanUzs: "2500000",
	commissionPerTicketUzs: "",
	adminEmail: "",
	adminPassword: "",
	adminFirstName: "",
	adminLastName: "",
};

function optional(value: string) {
	const next = value.trim();
	return next ? next : undefined;
}

function emailOk(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const STEPS: WizardStep<Draft>[] = [
	{
		id: "profile",
		title: "Кинотеатр",
		subtitle: "Название и контакты",
		validate: (data) => (data.name.trim().length >= 2 ? null : "Название — минимум 2 символа"),
		body: (data, update) => (
			<div className={fields.sectionGrid}>
				<label className={`${fields.field} ${fields.span2}`}>
					<span className={fields.label}>Название</span>
					<input
						className={fields.input}
						value={data.name}
						onChange={(event) => update({ name: event.target.value })}
						required
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Адрес</span>
					<input
						className={fields.input}
						value={data.address}
						onChange={(event) => update({ address: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Телефон</span>
					<input
						className={fields.input}
						value={data.phone}
						onChange={(event) => update({ phone: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Часовой пояс</span>
					<select
						className={fields.input}
						value={data.timezone}
						onChange={(event) => update({ timezone: event.target.value })}
					>
						<option value="Asia/Tashkent">Asia/Tashkent</option>
						<option value="Asia/Samarkand">Asia/Samarkand</option>
						<option value="UTC">UTC</option>
					</select>
				</label>
				<label className={`${fields.field} ${fields.span2}`}>
					<span className={fields.label}>Описание</span>
					<textarea
						className={fields.textarea}
						value={data.description}
						onChange={(event) => update({ description: event.target.value })}
					/>
				</label>
			</div>
		),
	},
	{
		id: "plan",
		title: "Подписка",
		subtitle: "Месячный план и комиссия с билета",
		validate: (data) => {
			const plan = Number(data.monthlyPlanUzs);
			if (!Number.isInteger(plan) || plan < 1) return "Укажите план целым числом больше нуля";
			if (data.commissionPerTicketUzs.trim() === "") return null;
			const commission = Number(data.commissionPerTicketUzs);
			if (!Number.isInteger(commission) || commission < 0) return "Комиссия — целое число от нуля";
			return null;
		},
		body: (data, update) => (
			<div className={fields.sectionGrid}>
				<label className={fields.field}>
					<span className={fields.label}>План / месяц, сум</span>
					<input
						className={fields.input}
						inputMode="numeric"
						value={data.monthlyPlanUzs}
						onChange={(event) => update({ monthlyPlanUzs: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Комиссия / билет</span>
					<input
						className={fields.input}
						inputMode="numeric"
						placeholder="По умолчанию платформы"
						value={data.commissionPerTicketUzs}
						onChange={(event) => update({ commissionPerTicketUzs: event.target.value })}
					/>
				</label>
			</div>
		),
	},
	{
		id: "admin",
		title: "Администратор",
		subtitle: "Первый вход в кабинет кинотеатра",
		validate: (data) => {
			if (!emailOk(data.adminEmail)) return "Укажите почту администратора";
			if (data.adminPassword.length < 8) return "Пароль — минимум 8 символов";
			return null;
		},
		body: (data, update) => (
			<div className={fields.sectionGrid}>
				<label className={fields.field}>
					<span className={fields.label}>Электронная почта</span>
					<input
						className={fields.input}
						type="email"
						autoComplete="off"
						value={data.adminEmail}
						onChange={(event) => update({ adminEmail: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Пароль</span>
					<input
						className={fields.input}
						type="password"
						autoComplete="new-password"
						value={data.adminPassword}
						onChange={(event) => update({ adminPassword: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Имя</span>
					<input
						className={fields.input}
						value={data.adminFirstName}
						onChange={(event) => update({ adminFirstName: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Фамилия</span>
					<input
						className={fields.input}
						value={data.adminLastName}
						onChange={(event) => update({ adminLastName: event.target.value })}
					/>
				</label>
			</div>
		),
	},
	{
		id: "review",
		title: "Проверка",
		subtitle: "Проверьте данные и создайте кинотеатр",
		body: (data) => (
			<WizardSummary
				rows={[
					{ label: "Кинотеатр", value: data.name.trim() },
					{ label: "Адрес", value: data.address.trim() },
					{ label: "Телефон", value: data.phone.trim() },
					{ label: "Часовой пояс", value: data.timezone },
					{
						label: "План / месяц",
						value: formatMoneyUzs(Number(data.monthlyPlanUzs) || 0),
					},
					{
						label: "Комиссия / билет",
						value: data.commissionPerTicketUzs.trim()
							? formatMoneyUzs(Number(data.commissionPerTicketUzs) || 0)
							: "По умолчанию",
					},
					{ label: "Администратор", value: data.adminEmail.trim() },
					{
						label: "Имя",
						value: [data.adminFirstName, data.adminLastName].filter(Boolean).join(" "),
					},
				]}
			/>
		),
	},
];

export function NewClientAction({ title, description }: { title: string; description: string }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(EMPTY);

	function show() {
		setDraft(EMPTY);
		setOpen(true);
	}

	return (
		<>
			<CreateBanner
				title={title}
				description={description}
				action={<CreateAction label="Новый кинотеатр" onClick={show} />}
			/>
			<Wizard
				open={open}
				title="Новый клиент"
				subtitle="Создайте кинотеатр шаг за шагом."
				steps={STEPS}
				data={draft}
				onChange={setDraft}
				onReset={() => setDraft(EMPTY)}
				onClose={() => setOpen(false)}
				submitLabel="Создать кинотеатр"
				onSubmit={async (data) => {
					try {
						await clientApi<{ id: string }>("/admin/cinemas", {
							method: "POST",
							body: JSON.stringify({
								name: data.name.trim(),
								address: optional(data.address),
								phone: optional(data.phone),
								description: optional(data.description),
								timezone: data.timezone,
								monthlyPlanUzs: Number(data.monthlyPlanUzs),
								commissionPerTicketUzs:
									data.commissionPerTicketUzs.trim() === ""
										? null
										: Number(data.commissionPerTicketUzs),
								admin: {
									email: data.adminEmail.trim(),
									password: data.adminPassword,
									firstName: optional(data.adminFirstName),
									lastName: optional(data.adminLastName),
								},
							}),
						});
					} catch (cause) {
						const text = errorText(cause, "Не удалось создать кинотеатр");
						throw new Error(
							text.toLowerCase().includes("already registered")
								? "Эта почта уже зарегистрирована"
								: text,
						);
					}
					setOpen(false);
					router.refresh();
				}}
			/>
		</>
	);
}
