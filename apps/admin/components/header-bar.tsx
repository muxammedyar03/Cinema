"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { HeaderActions } from "./header-actions";

export function HeaderBar() {
	const pathname = usePathname();
	const router = useRouter();
	const showBack = pathname !== "/";

	return (
		<div className="mb-2 flex items-center justify-between gap-3">
			{showBack ? (
				<button
					type="button"
					className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink hover:border-orange/40 hover:text-orange"
					onClick={() => router.back()}
				>
					<ArrowLeft className="size-4" strokeWidth={2} />
					Назад
				</button>
			) : (
				<span />
			)}
			<HeaderActions />
		</div>
	);
}
