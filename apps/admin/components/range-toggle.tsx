"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "../lib/ui-kit";

export function RangeToggle({ active }: { active: "daily" | "weekly" }) {
	const router = useRouter();
	return (
		<SegmentedControl
			ariaLabel="Период показателей"
			value={active}
			onChange={(value) => router.push(value === "weekly" ? "/?range=weekly" : "/")}
			options={[
				{ value: "daily", label: "По дням" },
				{ value: "weekly", label: "По неделям" },
			]}
		/>
	);
}
