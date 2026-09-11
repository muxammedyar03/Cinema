"use client";

import { useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { errorText } from "../lib/api-error";
import { cx, ui } from "../lib/ui";

export function FollowButton({
	cinemaId,
	initialFollowing,
	initialCount,
}: {
	cinemaId: string;
	initialFollowing: boolean;
	initialCount: number;
}) {
	const [following, setFollowing] = useState(initialFollowing);
	const [count, setCount] = useState(initialCount);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	async function toggle() {
		setBusy(true);
		setError("");
		try {
			await ensureTelegramSession();
			if (following) {
				await clientApi(`/public/cinemas/${cinemaId}/follow`, { method: "DELETE" });
				setFollowing(false);
				setCount((n) => Math.max(0, n - 1));
			} else {
				await clientApi(`/public/cinemas/${cinemaId}/follow`, { method: "POST" });
				setFollowing(true);
				setCount((n) => n + 1);
			}
		} catch (err) {
			setError(errorText(err, "Не удалось обновить подписку"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div>
			<button
				type="button"
				className={cx(ui.cta, following && ui.ctaGhost, "w-full")}
				disabled={busy}
				onClick={() => void toggle()}
			>
				{busy ? "…" : following ? "Отписаться" : "Подписаться"}
				<span className="ml-2 text-[12px] font-semibold opacity-80">{count}</span>
			</button>
			{error ? <p className="mt-2 text-center text-[12px] text-red-400">{error}</p> : null}
		</div>
	);
}
