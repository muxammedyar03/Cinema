"use client";

import type { SessionUser } from "@cinema/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clientApi } from "../lib/api";
import { primaryCinemaId, roleOf } from "../lib/rbac";
import { cx } from "../lib/ui";

export function ProfileGate({ user }: { user: SessionUser }) {
	const pathname = usePathname();
	const cinemaId = primaryCinemaId(user);
	const [missing, setMissing] = useState(0);
	const skip = roleOf(user) === "super" || !cinemaId || pathname.startsWith("/profile");

	useEffect(() => {
		if (skip || !cinemaId) return;
		let alive = true;
		clientApi<{ profileCompletion: { profileComplete: boolean; missing: string[] } }>(
			`/admin/cinemas/${cinemaId}/profile`,
		)
			.then((p) => {
				if (alive)
					setMissing(p.profileCompletion.profileComplete ? 0 : p.profileCompletion.missing.length);
			})
			.catch(() => {
				if (alive) setMissing(0);
			});
		return () => {
			alive = false;
		};
	}, [cinemaId, skip]);

	if (skip || missing === 0) return null;

	return (
		<div className="mb-4 rounded-xl border border-orange/35 bg-orange/[0.08] px-4 py-3 text-[13px]">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-ink">
					Заполните профиль кинотеатра
					<span className="text-muted"> · осталось шагов: {missing}</span>
				</p>
				<Link className={cx("font-semibold text-orange")} href="/profile">
					Продолжить
				</Link>
			</div>
		</div>
	);
}
