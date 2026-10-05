"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { waitForTelegram } from "../lib/telegram";
import { cx } from "../lib/ui";
import { AppHeader } from "./app-header";

export function dockHidden(pathname: string): boolean {
	return (
		pathname.startsWith("/movies/") ||
		pathname.startsWith("/sessions/") ||
		pathname.startsWith("/pay/") ||
		(pathname.startsWith("/orders/") && pathname !== "/orders")
	);
}

export function AppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const focus = dockHidden(pathname);
	const router = useRouter();
	const seating = pathname.startsWith("/sessions/");
	useEffect(() => {
		let disposed = false;
		let cleanup = () => {};
		void waitForTelegram().then((tg) => {
			if (disposed || !tg?.initData) return;
			const back = () => router.back();
			try {
				if (focus && tg.BackButton) {
					tg.BackButton.onClick(back);
					tg.BackButton.show();
					document.documentElement.classList.add("telegram-back");
				}
				if (seating && tg.isVersionAtLeast?.("7.7")) tg.disableVerticalSwipes?.();
				cleanup = () => {
					tg.BackButton?.offClick(back);
					tg.BackButton?.hide();
					document.documentElement.classList.remove("telegram-back");
					if (seating && tg.isVersionAtLeast?.("7.7")) tg.enableVerticalSwipes?.();
				};
			} catch {
				/* Older Telegram: use the browser fallback. */
			}
		});
		return () => {
			disposed = true;
			cleanup();
		};
	}, [focus, seating, router]);
	return (
		<div className={cx("app-shell", focus && "app-shell-focus", seating && "app-shell-seating")}>
			<AppHeader />
			<main>{children}</main>
		</div>
	);
}
