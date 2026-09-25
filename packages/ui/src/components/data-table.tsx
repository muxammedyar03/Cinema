import type { ReactNode } from "react";
import styles from "./data-table.module.css";
import { EmptyState } from "./empty-state";

export type DataTableColumn<T> = {
	id: string;
	header: string;
	cell: (row: T) => ReactNode;
};

export function DataTable<T>({
	columns,
	rows,
	getRowKey,
	emptyTitle = "Нет данных",
	emptyDescription,
}: {
	columns: DataTableColumn<T>[];
	rows: T[];
	getRowKey: (row: T) => string;
	emptyTitle?: string;
	emptyDescription?: string;
}) {
	if (rows.length === 0) {
		return <EmptyState title={emptyTitle} description={emptyDescription} />;
	}

	return (
		<div className={styles.wrap}>
			<table className={styles.table}>
				<thead>
					<tr>
						{columns.map((column) => (
							<th key={column.id} className={styles.th} scope="col">
								{column.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={getRowKey(row)}>
							{columns.map((column) => (
								<td key={column.id} className={styles.td}>
									{column.cell(row)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
