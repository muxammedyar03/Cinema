"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "../lib/ui";
import { AppHeader } from "./app-header";

export function dockHidden(pathname: string): boolean {
	return (
		pathname.startsWith("/sessions/") ||
		pathname.startsWith("/pay/") ||
		(pathname.startsWith("/orders/") && pathname !== "/orders")
	);
}

export function AppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const focus = dockHidden(pathname);
	return (
		<div className={cx("app-shell", focus && "app-shell-focus")}>
			<AppHeader />
			<main>{children}</main>
		</div>
	);
}
