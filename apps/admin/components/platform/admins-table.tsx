import { Badge, Card, DataTable } from "@cinema/ui";
import Link from "next/link";
import { adminStatusView, roleLabel } from "../../lib/platform/format";
import type { PlatformAdmin } from "../../lib/platform/types";
import styles from "./platform.module.css";

export function AdminsTable({ rows }: { rows: PlatformAdmin[] }) {
	return (
		<Card>
			<DataTable
				columns={[
					{
						id: "name",
						header: "Имя",
						cell: (row) => <span className={styles.nameLink}>{row.name}</span>,
					},
					{
						id: "email",
						header: "Электронная почта",
						cell: (row) => row.email ?? "—",
					},
					{
						id: "role",
						header: "Роль",
						cell: (row) => roleLabel(row.role),
					},
					{
						id: "cinema",
						header: "Кинотеатр",
						cell: (row) => (
							<Link className={styles.nameLink} href={`/cinemas/${row.cinemaId}`}>
								{row.cinemaName}
							</Link>
						),
					},
					{
						id: "status",
						header: "Статус",
						cell: (row) => {
							const view = adminStatusView(row);
							return view ? <Badge tone={view.tone}>{view.label}</Badge> : "—";
						},
					},
				]}
				rows={rows}
				getRowKey={(row) => `${row.userId}-${row.cinemaId}`}
				emptyTitle="Администраторов пока нет"
				emptyDescription="Когда список подключится, здесь появятся администраторы кинотеатров."
			/>
		</Card>
	);
}
