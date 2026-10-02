import { Badge, Card, DataTable, type DataTableColumn } from "@cinema/ui";
import Link from "next/link";
import {
	cinemaStatusLabel,
	cinemaStatusTone,
	invoiceStatusLabel,
	showCityColumn,
} from "../../lib/platform/format";
import type { CinemaListItem } from "../../lib/platform/types";
import styles from "./platform.module.css";

export function CinemaTable({ rows }: { rows: CinemaListItem[] }) {
	const city = showCityColumn(rows);
	const columns: DataTableColumn<CinemaListItem>[] = [
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
			header: "Залов",
			cell: (row) => (row.halls === null ? "—" : String(row.halls)),
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
	];

	return (
		<Card>
			<DataTable
				columns={columns}
				rows={rows}
				getRowKey={(row) => row.id}
				emptyTitle="Кинотеатров пока нет"
				emptyDescription="Создайте кинотеатр — он появится в этом списке."
			/>
		</Card>
	);
}
