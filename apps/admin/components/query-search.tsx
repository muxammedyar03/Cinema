"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function QuerySearch({ placeholder, initial }: { placeholder: string; initial: string }) {
	const router = useRouter();
	const pathname = usePathname();
	const [value, setValue] = useState(initial);

	useEffect(() => {
		setValue(initial);
	}, [initial]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			const next = new URLSearchParams(window.location.search);
			const current = next.get("q") ?? "";
			const trimmed = value.trim();
			if (current === trimmed) return;
			if (trimmed) next.set("q", trimmed);
			else next.delete("q");
			const qs = next.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname);
		}, 250);
		return () => window.clearTimeout(handle);
	}, [pathname, router, value]);

	return (
		<input
			className="h-10 w-full rounded-[var(--radius-chip)] border border-[var(--chip-border)] bg-panel px-3.5 text-[13px] text-ink outline-none focus:border-primary sm:w-[260px]"
			value={value}
			onChange={(event) => setValue(event.target.value)}
			placeholder={placeholder}
			aria-label="Поиск"
		/>
	);
}
