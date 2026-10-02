"use client";

import {
	Card,
	CardHeader,
	Chip,
	DataTable,
	EmptyState,
	Wizard,
	type WizardStep,
	WizardSummary,
} from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";
import { personName, roleLabel } from "../../lib/platform/format";
import type { CinemaDossier } from "../../lib/platform/types";
import { CreateAction } from "../create-action";
import fields from "./fields.module.css";
import { ListPager } from "./list-pager";
import styles from "./platform.module.css";

type Person = CinemaDossier["admins"][number];
type RoleFilter = "ALL" | "CINEMA_ADMIN" | "STAFF";
type SortKey = "name" | "email" | "role";

type Draft = {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: "CINEMA_ADMIN" | "STAFF";
};

const EMPTY: Draft = {
	email: "",
	password: "",
	firstName: "",
	lastName: "",
	role: "STAFF",
};

const PAGE_SIZE = 6;

function optional(value: string) {
	const next = value.trim();
	return next ? next : undefined;
}

function emailOk(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const STEPS: WizardStep<Draft>[] = [
	{
		id: "person",
		title: "Сотрудник",
		subtitle: "Почта, имя и роль в кинотеатре",
		validate: (data) => (emailOk(data.email) ? null : "Укажите почту сотрудника"),
		body: (data, update) => (
			<div className={fields.sectionGrid}>
				<label className={`${fields.field} ${fields.span2}`}>
					<span className={fields.label}>Электронная почта</span>
					<input
						className={fields.input}
						type="email"
						autoComplete="off"
						value={data.email}
						onChange={(event) => update({ email: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Имя</span>
					<input
						className={fields.input}
						value={data.firstName}
						onChange={(event) => update({ firstName: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Фамилия</span>
					<input
						className={fields.input}
						value={data.lastName}
						onChange={(event) => update({ lastName: event.target.value })}
					/>
				</label>
				<label className={`${fields.field} ${fields.span2}`}>
					<span className={fields.label}>Роль</span>
					<select
						className={fields.input}
						value={data.role}
						onChange={(event) => update({ role: event.target.value as Draft["role"] })}
					>
						<option value="CINEMA_ADMIN">Администратор</option>
						<option value="STAFF">Контроль входа</option>
					</select>
				</label>
			</div>
		),
	},
	{
		id: "access",
		title: "Доступ",
		subtitle:
			"Для новой почты это пароль входа. Если сотрудник уже есть в системе, пароль не меняется.",
		validate: (data) => (data.password.length >= 8 ? null : "Пароль — минимум 8 символов"),
		body: (data, update) => (
			<label className={fields.field}>
				<span className={fields.label}>Пароль</span>
				<input
					className={fields.input}
					type="password"
					autoComplete="new-password"
					value={data.password}
					onChange={(event) => update({ password: event.target.value })}
				/>
			</label>
		),
	},
	{
		id: "review",
		title: "Проверка",
		subtitle: "Проверьте данные и добавьте сотрудника",
		body: (data) => (
			<WizardSummary
				rows={[
					{ label: "Почта", value: data.email.trim() },
					{ label: "Имя", value: [data.firstName, data.lastName].filter(Boolean).join(" ") },
					{ label: "Роль", value: roleLabel(data.role) },
				]}
			/>
		),
	},
];

function AddUserAction({ cinemaId }: { cinemaId: string }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(EMPTY);

	return (
		<>
			<CreateAction
				label="Сотрудник"
				size="small"
				onClick={() => {
					setDraft(EMPTY);
					setOpen(true);
				}}
			/>
			<Wizard
				open={open}
				title="Новый сотрудник"
				subtitle="Добавьте пользователя кинотеатра."
				steps={STEPS}
				data={draft}
				onChange={setDraft}
				onReset={() => setDraft(EMPTY)}
				onClose={() => setOpen(false)}
				submitLabel="Добавить"
				onSubmit={async (data) => {
					try {
						await clientApi(`/admin/cinemas/${cinemaId}/staff`, {
							method: "POST",
							body: JSON.stringify({
								email: data.email.trim(),
								password: data.password,
								firstName: optional(data.firstName),
								lastName: optional(data.lastName),
								role: data.role,
							}),
						});
					} catch (cause) {
						throw new Error(errorText(cause, "Не удалось добавить сотрудника"));
					}
					setOpen(false);
					router.refresh();
				}}
			/>
		</>
	);
}

export function UsersBoard({ cinemaId, people }: { cinemaId: string; people: Person[] }) {
	const [query, setQuery] = useState("");
	const [role, setRole] = useState<RoleFilter>("ALL");
	const [sort, setSort] = useState<SortKey>("name");
	const [page, setPage] = useState(1);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return people
			.filter((person) => (role === "ALL" ? true : person.role === role))
			.filter((person) => {
				if (!needle) return true;
				const name = personName(person.firstName, person.lastName).toLowerCase();
				return name.includes(needle) || (person.email ?? "").toLowerCase().includes(needle);
			})
			.sort((left, right) => {
				if (sort === "email") return (left.email ?? "").localeCompare(right.email ?? "", "ru");
				if (sort === "role") return roleLabel(left.role).localeCompare(roleLabel(right.role), "ru");
				return personName(left.firstName, left.lastName).localeCompare(
					personName(right.firstName, right.lastName),
					"ru",
				);
			});
	}, [people, query, role, sort]);

	const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pages);
	const start = (safePage - 1) * PAGE_SIZE;
	const visible = filtered.slice(start, start + PAGE_SIZE);

	return (
		<Card>
			<CardHeader title="Сотрудники" extra={<AddUserAction cinemaId={cinemaId} />} />
			<div className={styles.toolbar}>
				<input
					className={`${fields.input} ${styles.toolbarSearch}`}
					value={query}
					placeholder="Имя или почта"
					aria-label="Поиск сотрудника"
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
				<select
					className={`${fields.input} ${styles.toolbarSort}`}
					aria-label="Сортировка сотрудников"
					value={sort}
					onChange={(event) => {
						setSort(event.target.value as SortKey);
						setPage(1);
					}}
				>
					<option value="name">По имени</option>
					<option value="email">По почте</option>
					<option value="role">По роли</option>
				</select>
			</div>
			<fieldset className={`${styles.filters} ${styles.filtersInCard}`} aria-label="Роль">
				{(
					[
						["ALL", "Все"],
						["CINEMA_ADMIN", "Администраторы"],
						["STAFF", "Контроль входа"],
					] as const
				).map(([value, label]) => (
					<Chip
						key={value}
						active={role === value}
						onClick={() => {
							setRole(value);
							setPage(1);
						}}
					>
						{label}
					</Chip>
				))}
			</fieldset>
			{visible.length === 0 ? (
				<EmptyState
					title={people.length === 0 ? "Сотрудников пока нет" : "Ничего не найдено"}
					description={
						people.length === 0
							? "Добавьте администратора или сотрудника контроля входа."
							: "Измените поиск или фильтр роли."
					}
				/>
			) : (
				<DataTable
					columns={[
						{
							id: "name",
							header: "Имя",
							cell: (row) => personName(row.firstName, row.lastName),
						},
						{ id: "email", header: "Электронная почта", cell: (row) => row.email ?? "—" },
						{ id: "role", header: "Роль", cell: (row) => roleLabel(row.role) },
					]}
					rows={visible}
					getRowKey={(row) => row.staffId}
				/>
			)}
			<ListPager
				page={safePage}
				pages={pages}
				from={filtered.length === 0 ? 0 : start + 1}
				to={Math.min(start + PAGE_SIZE, filtered.length)}
				total={filtered.length}
				onPage={setPage}
			/>
		</Card>
	);
}
