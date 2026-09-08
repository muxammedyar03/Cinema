"use client";

import Link from "next/link";
import { cx, ui } from "../../lib/ui";

const filters = [
	{ id: "ALL", label: "Все" },
	{ id: "PUBLISHED", label: "PUBLISHED" },
	{ id: "DRAFT", label: "DRAFT" },
	{ id: "CANCELLED", label: "CANCELLED" },
] as const;

export function SessionFilters({ active }: { active: string }) {
	return (
		<div className="mb-3.5 flex flex-wrap gap-2">
			{filters.map((f) => (
				<Link
					key={f.id}
					href={f.id === "ALL" ? "/sessions" : `/sessions?status=${f.id}`}
					className={cx(ui.chip, active === f.id && ui.chipOn)}
				>
					{f.label}
				</Link>
			))}
		</div>
	);
}
