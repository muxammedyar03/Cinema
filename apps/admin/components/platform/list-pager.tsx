"use client";

import { Button } from "@cinema/ui";
import styles from "./platform.module.css";

export function ListPager({
	page,
	pages,
	from,
	to,
	total,
	onPage,
}: {
	page: number;
	pages: number;
	from: number;
	to: number;
	total: number;
	onPage: (page: number) => void;
}) {
	if (total === 0) return null;
	return (
		<div className={styles.pager}>
			<span>
				{from}–{to} из {total}
			</span>
			<div className={styles.pagerActions}>
				<Button
					variant="secondary"
					size="small"
					disabled={page <= 1}
					onClick={() => onPage(page - 1)}
				>
					Назад
				</Button>
				<span className={styles.pagerIndex}>
					{page} / {pages}
				</span>
				<Button
					variant="secondary"
					size="small"
					disabled={page >= pages}
					onClick={() => onPage(page + 1)}
				>
					Дальше
				</Button>
			</div>
		</div>
	);
}
