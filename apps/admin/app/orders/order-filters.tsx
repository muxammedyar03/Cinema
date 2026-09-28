"use client";

import { useRouter } from "next/navigation";
import { Chip } from "../../lib/ui-kit";

const filters = [
	{ id: "ALL", label: "Все" },
	{ id: "PAID", label: "Оплачен" },
	{ id: "PENDING_PAYMENT", label: "Ожидает оплаты" },
	{ id: "REFUNDED", label: "Возвращён" },
] as const;

export function OrderFilters({ active }: { active: string }) {
	const router = useRouter();

	function open(id: string) {
		const params = new URLSearchParams(window.location.search);
		if (id === "ALL") params.delete("status");
		else params.set("status", id);
		const qs = params.toString();
		router.push(qs ? `/orders?${qs}` : "/orders");
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
