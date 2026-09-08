"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientApi } from "../lib/api";

type Access =
	| { locked: false }
	| {
			locked: true;
			cinemaName?: string;
			invoice?: { publicNumber: string; amountUzs: number; daysLate: number } | null;
			lockAfterDays?: number;
	  };

/** Redirects cinema staff to lockout page when subscription is LOCKED. */
export function BillingLockGate({ isSuper }: { isSuper: boolean }) {
	const pathname = usePathname();
	const router = useRouter();
	const [checked, setChecked] = useState(isSuper);

	useEffect(() => {
		if (isSuper) return;
		if (pathname.startsWith("/billing/locked") || pathname.startsWith("/login")) {
			setChecked(true);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const access = await clientApi<Access>("/admin/billing/access");
				if (cancelled) return;
				if (access.locked) {
					router.replace("/billing/locked");
					return;
				}
			} catch {
				/* ignore — page may still load */
			} finally {
				if (!cancelled) setChecked(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isSuper, pathname, router]);

	if (!checked && !isSuper && !pathname.startsWith("/billing/locked")) {
		return (
			<div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 text-sm text-muted">
				Проверка подписки…
			</div>
		);
	}
	return null;
}
