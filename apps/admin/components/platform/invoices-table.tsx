import { Badge, Card, DataTable } from "@cinema/ui";
import Link from "next/link";
import { InvoiceRowActions } from "../../app/billing/invoices/invoice-row-actions";
import {
	formatDueDate,
	formatMoneyUzs,
	formatPeriod,
	invoiceStatusLabel,
	invoiceStatusTone,
	unlockRowIds,
} from "../../lib/platform/format";
import type { InvoiceListItem } from "../../lib/platform/types";
import styles from "./platform.module.css";

export function InvoicesTable({ rows }: { rows: InvoiceListItem[] }) {
	const unlocks = unlockRowIds(rows);
	return (
		<Card>
			<DataTable
				columns={[
					{ id: "number", header: "Счёт", cell: (row) => row.publicNumber },
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
						id: "period",
						header: "Период",
						cell: (row) => (
							<span>
								{formatPeriod(row.periodYear, row.periodMonth)}
								<span className={styles.sub}>
									Срок {formatDueDate(row.dueAt)}
									{row.daysLate > 0 ? ` · ${row.daysLate} дн.` : ""}
								</span>
							</span>
						),
					},
					{ id: "amount", header: "Сумма", cell: (row) => formatMoneyUzs(row.amountUzs) },
					{
						id: "status",
						header: "Статус",
						cell: (row) => (
							<Badge tone={invoiceStatusTone(row.status)}>{invoiceStatusLabel(row.status)}</Badge>
						),
					},
					{
						id: "actions",
						header: "",
						cell: (row) => (
							<InvoiceRowActions
								invoiceId={row.id}
								status={row.status}
								cinemaId={row.cinemaId}
								unlock={unlocks.has(row.id)}
							/>
						),
					},
				]}
				rows={rows}
				getRowKey={(row) => row.id}
				emptyTitle="Счетов пока нет"
				emptyDescription="Счета подписки кинотеатров появятся здесь."
			/>
		</Card>
	);
}
