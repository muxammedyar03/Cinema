"use client";

import { Badge, Card, Chip, DataTable, EmptyState } from "@cinema/ui";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	cinemaStatusLabel,
	cinemaStatusTone,
	invoiceStatusLabel,
	showCityColumn,
} from "../../lib/platform/format";
import type { CinemaListItem } from "../../lib/platform/types";
import fields from "./fields.module.css";
import { ListPager } from "./list-pager";
import styles from "./platform.module.css";

const PAGE_SIZE = 8;

type StatusFilter = "ALL" | "ACTIVE" | "PENDING" | "DISABLED" | "LOCKED";
type SortKey = "name-asc" | "name-desc" | "halls" | "staff";

const STATUS: Array<{ value: StatusFilter; label: string }> = [
	{ value: "ALL", label: "Все" },
	{ value: "ACTIVE", label: "Активные" },
	{ value: "PENDING", label: "Ожидают подключения" },
	{ value: "DISABLED", label: "Отключённые" },
	{ value: "LOCKED", label: "Заблокированные" },
];

function matchesStatus(row: CinemaListItem, status: StatusFilter) {
	if (status === "ALL") return true;
	if (status === "PENDING") return row.profileComplete === false;
	if (status === "ACTIVE") return row.status === "ACTIVE" && row.profileComplete !== false;
	return row.status === status;
}

function matchesQuery(row: CinemaListItem, query: string) {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return [row.name, row.city, row.address, row.phone].some((value) =>
		(value ?? "").toLowerCase().includes(needle),
	);
}

function compare(left: CinemaListItem, right: CinemaListItem, sort: SortKey) {
	if (sort === "halls") return (right.halls ?? -1) - (left.halls ?? -1);
	if (sort === "staff") return (right.staffCount ?? -1) - (left.staffCount ?? -1);
	const byName = left.name.localeCompare(right.name, "ru");
	return sort === "name-desc" ? -byName : byName;
}

export function CinemaDirectory({ rows }: { rows: CinemaListItem[] }) {
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<StatusFilter>("ALL");
	const [sort, setSort] = useState<SortKey>("name-asc");
	const [page, setPage] = useState(1);
	const city = showCityColumn(rows);

	const filtered = useMemo(() => {
		return rows
			.filter((row) => matchesStatus(row, status) && matchesQuery(row, query))
			.sort((left, right) => compare(left, right, sort));
	}, [rows, query, status, sort]);

	const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pages);
	const start = (safePage - 1) * PAGE_SIZE;
	const visible = filtered.slice(start, start + PAGE_SIZE);

	return (
		<Card>
			<div className={styles.toolbar}>
				<input
					className={`${fields.input} ${styles.toolbarSearch}`}
					value={query}
					placeholder="Название, город или адрес"
					aria-label="Поиск кинотеатра"
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
				<select
					className={`${fields.input} ${styles.toolbarSort}`}
					aria-label="Сортировка"
					value={sort}
					onChange={(event) => {
						setSort(event.target.value as SortKey);
						setPage(1);
					}}
				>
					<option value="name-asc">Название А–Я</option>
					<option value="name-desc">Название Я–А</option>
					<option value="halls">Больше залов</option>
					<option value="staff">Больше сотрудников</option>
				</select>
			</div>
			<fieldset
				className={`${styles.filters} ${styles.filtersInCard}`}
				aria-label="Статус кинотеатра"
			>
				{STATUS.map((option) => (
					<Chip
						key={option.value}
						active={status === option.value}
						onClick={() => {
							setStatus(option.value);
							setPage(1);
						}}
					>
						{option.label}
					</Chip>
				))}
			</fieldset>
			{visible.length === 0 ? (
				<EmptyState
					title={rows.length === 0 ? "Кинотеатров пока нет" : "Ничего не найдено"}
					description={
						rows.length === 0
							? "Создайте клиента — кинотеатр появится в этом списке."
							: "Измените поиск или фильтр статуса."
					}
				/>
			) : (
				<DataTable
					columns={[
						{
							id: "name",
							header: "Кинотеатр",
							cell: (row) => (
								<Link className={styles.nameLink} href={`/clients/${row.id}`}>
									{row.name}
								</Link>
							),
						},
						...(city
							? [
									{
										id: "city",
										header: "Город",
										cell: (row: CinemaListItem) => row.city ?? "—",
									},
								]
							: []),
						{
							id: "halls",
							header: "Залы",
							cell: (row) => (row.halls === null ? "—" : String(row.halls)),
						},
						{
							id: "staff",
							header: "Сотрудники",
							cell: (row) => (row.staffCount === null ? "—" : String(row.staffCount)),
						},
						{
							id: "status",
							header: "Статус",
							cell: (row) => (
								<span>
									<Badge tone={cinemaStatusTone(row)}>{cinemaStatusLabel(row)}</Badge>
									{row.profileComplete !== false && row.billingStatus ? (
										<span className={styles.sub}>{invoiceStatusLabel(row.billingStatus)}</span>
									) : null}
								</span>
							),
						},
					]}
					rows={visible}
					getRowKey={(row) => row.id}
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
