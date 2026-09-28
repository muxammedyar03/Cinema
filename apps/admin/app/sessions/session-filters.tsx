"use client";

import { useRouter } from "next/navigation";
import { Chip } from "../../lib/ui-kit";

const filters = [
	{ id: "ALL", label: "Все" },
	{ id: "PUBLISHED", label: "Опубликован" },
	{ id: "DRAFT", label: "Черновик" },
	{ id: "CANCELLED", label: "Отменён" },
] as const;

export function SessionFilters({ active }: { active: string }) {
	const router = useRouter();

	function open(id: string) {
		const params = new URLSearchParams(window.location.search);
		if (id === "ALL") params.delete("status");
		else params.set("status", id);
		const qs = params.toString();
		router.push(qs ? `/sessions?${qs}` : "/sessions");
	}

	return (
		<div className="flex flex-wrap gap-2">
			{filters.map((filter) => (
				<Chip key={filter.id} active={active === filter.id} onClick={() => open(filter.id)}>
					{filter.label}
				</Chip>
			))}
		</div>
	);
}
