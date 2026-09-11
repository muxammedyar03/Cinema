"use client";

import type { SessionUser } from "@cinema/types";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { primaryCinemaId, primaryCinemaName, roleOf } from "../lib/rbac";
import { cx, ui } from "../lib/ui";
import { AdminNav } from "./admin-nav";
import { BillingLockGate } from "./billing-lock-gate";
import { HeaderBar } from "./header-bar";
import { ProfileGate } from "./profile-gate";

const KEY = "cinema-admin-sidebar-collapsed";

function roleLabelOf(role: ReturnType<typeof roleOf>) {
	if (role === "super") return "Супер-админ";
	if (role === "cinema") return "Cinema Admin";
	return "Staff";
}

function SidebarBrand({
	role,
	cinemaName,
	collapsed,
	onToggle,
}: {
	role: ReturnType<typeof roleOf>;
	cinemaName: string | null;
	collapsed: boolean;
	onToggle: () => void;
}) {
	return (
		<div
			className={cx(
				"mb-1 flex items-start gap-2 px-2.5 pb-3 pt-1.5",
				collapsed && "md:flex-col md:items-center md:px-0",
			)}
		>
			<div className={cx("min-w-0 flex-1", collapsed && "md:hidden")}>
				<div className={ui.brand}>Cinema</div>
				<div className="mt-1 text-[11px] text-faint">
					{role === "super" ? "Platform console" : (cinemaName ?? "Box-office console")}
				</div>
			</div>
			<button
				type="button"
				onClick={onToggle}
				className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-elev text-ink hover:border-orange hover:text-orange"
				title={collapsed ? "Открыть меню" : "Свернуть меню"}
				aria-label={collapsed ? "Открыть меню" : "Свернуть меню"}
			>
				{collapsed ? (
					<PanelLeftOpen className="size-4" strokeWidth={1.8} />
				) : (
					<PanelLeftClose className="size-4" strokeWidth={1.8} />
				)}
			</button>
		</div>
	);
}

function SidebarUser({
	user,
	role,
	cinemaName,
	collapsed,
}: {
	user: SessionUser;
	role: ReturnType<typeof roleOf>;
	cinemaName: string | null;
	collapsed: boolean;
}) {
	const showCinema = Boolean(cinemaName && role !== "super");
	return (
		<div
			className={cx(
				"mt-auto flex items-center gap-2.5 border-t border-line px-2.5 pb-1 pt-3.5 text-xs leading-normal text-muted",
				collapsed && "md:justify-center md:px-0",
			)}
		>
			<div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-orange font-brand text-[13px] font-extrabold text-[#171310]">
				{(user.email ?? "?").slice(0, 1).toUpperCase()}
			</div>
			<div className={cx("min-w-0", collapsed && "md:hidden")}>
				{showCinema ? <div className="truncate font-medium text-ink">{cinemaName}</div> : null}
				<div className={showCinema ? "truncate text-[11px] text-faint" : "font-medium text-ink"}>
					{user.email}
				</div>
				<div className="text-[11px] text-faint">{roleLabelOf(role)}</div>
			</div>
		</div>
	);
}

export function Shell({ user, children }: { user: SessionUser; children: ReactNode }) {
	const role = roleOf(user);
	const cinemaName = primaryCinemaName(user);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		setCollapsed(localStorage.getItem(KEY) === "1");
	}, []);

	function toggle() {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem(KEY, next ? "1" : "0");
			return next;
		});
	}

	return (
		<div
			className={cx(
				"grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-200",
				collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[252px_1fr]",
			)}
		>
			<BillingLockGate isSuper={role === "super"} />
			<aside
				className={cx(
					"sticky top-0 flex h-auto flex-col gap-0.5 overflow-y-auto overflow-x-hidden border-b border-line bg-nav px-3 pb-4 pt-5 md:h-screen md:border-b-0 md:border-r",
					collapsed && "md:px-2",
				)}
			>
				<SidebarBrand role={role} cinemaName={cinemaName} collapsed={collapsed} onToggle={toggle} />
				<AdminNav user={user} collapsed={collapsed} />
				<SidebarUser user={user} role={role} cinemaName={cinemaName} collapsed={collapsed} />
			</aside>
			<main className="min-w-0 px-[34px] pb-[70px] pt-[30px]">
				<HeaderBar />
				{role !== "super" && primaryCinemaId(user) ? <ProfileGate user={user} /> : null}
				{children}
			</main>
		</div>
	);
}
