"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	FEATURED_SAVE_ERROR,
	FEATURED_WARNING,
	isOptionalFieldError,
} from "../../lib/featured-film";
import { saveFeatured } from "./save-featured";

export function FeaturedSwitch({
	movieId,
	featured,
	others,
}: {
	movieId: string;
	featured?: boolean;
	others: Array<{ id: string; isFeatured?: boolean | null }>;
}) {
	const router = useRouter();
	const serverOn = featured === true;
	const [override, setOverride] = useState<boolean | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const on = override ?? serverOn;

	if (override !== null && override === serverOn) {
		setOverride(null);
	}

	async function toggle() {
		const next = !on;
		setBusy(true);
		setError("");
		setOverride(next);
		try {
			await saveFeatured(movieId, next, others);
			router.refresh();
		} catch (err) {
			setOverride(null);
			setError(isOptionalFieldError(err) ? err.message : FEATURED_SAVE_ERROR);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="mb-3">
			<label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
				<input
					type="checkbox"
					role="switch"
					className="size-4 accent-[var(--primary)]"
					checked={on}
					disabled={busy}
					aria-checked={on}
					onChange={() => void toggle()}
				/>
				В центре внимания
			</label>
			{on ? null : <p className="mb-0 mt-1 text-[12px] text-[var(--warn)]">{FEATURED_WARNING}</p>}
			{error ? <p className="mb-0 mt-1 text-[12px] text-bad">{error}</p> : null}
		</div>
	);
}
