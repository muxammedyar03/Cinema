"use client";

import { Button, Toast } from "@cinema/ui";
import { useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { errorText } from "../lib/api-error";

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
				setCount((value) => Math.max(0, value - 1));
			} else {
				await clientApi(`/public/cinemas/${cinemaId}/follow`, { method: "POST" });
				setFollowing(true);
				setCount((value) => value + 1);
			}
		} catch (err) {
			setError(errorText(err, "Не удалось обновить подписку"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div>
			<Button
				type="button"
				className="v2-full"
				variant={following ? "secondary" : "primary"}
				disabled={busy}
				onClick={() => void toggle()}
			>
				{busy ? "…" : following ? "Отписаться" : "Подписаться"}
				<span>{count}</span>
			</Button>
			<Toast message={error} open={Boolean(error)} />
		</div>
	);
}
