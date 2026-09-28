"use client";

import type { SessionUser } from "@cinema/types";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { clientApi } from "../lib/api";
import { ruCount } from "../lib/format";
import { primaryCinemaId, primaryCinemaName, roleOf } from "../lib/rbac";
import { cx } from "../lib/ui";
import { AdminNav } from "./admin-nav";
import { BillingLockGate } from "./billing-lock-gate";
import { HeaderBar } from "./header-bar";
import { ProfileGate } from "./profile-gate";

const KEY = "cinema-admin-sidebar-collapsed";

function roleLabel(role: ReturnType<typeof roleOf>) {
	if (role === "super") return "Суперадминистратор";
	if (role === "cinema") return "Администратор";
	return "Сотрудник";
}

function HallCount({ cinemaId }: { cinemaId: string }) {
	const [count, setCount] = useState<number | null>(null);

	useEffect(() => {
		let alive = true;
		clientApi<{ halls?: unknown[]; _count?: { halls?: number } }>(`/admin/cinemas/${cinemaId}`)
			.then((cinema) => {
				if (!alive) return;
				const next = cinema._count?.halls ?? cinema.halls?.length;
				setCount(typeof next === "number" ? next : null);
			})
			.catch(() => {
				if (alive) setCount(null);
			});
		return () => {
			alive = false;
		};
	}, [cinemaId]);

	if (count == null) return null;
	return (
		<small className="block text-[11px] text-nav-muted">
			{count} {ruCount(count, "зал", "зала", "залов")}
		</small>
	);
}

export function Shell({
	user,
	children,
	billingLock = true,
}: {
	user: SessionUser;
	children: ReactNode;
	billingLock?: boolean;
}) {
	const role = roleOf(user);
	const cinemaName = primaryCinemaName(user);
	const cinemaId = primaryCinemaId(user);
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [trackedPath, setTrackedPath] = useState(pathname);
	const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

	if (trackedPath !== pathname) {
		setTrackedPath(pathname);
		setMenuOpen(false);
	}

	useEffect(() => {
		setCollapsed(localStorage.getItem(KEY) === "1");
	}, []);

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") setMenuOpen(false);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	function toggleCollapsed() {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem(KEY, next ? "1" : "0");
			return next;
		});
	}

	return (
		<div
			className={cx(
				"min-h-screen md:grid",
				collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[244px_1fr]",
			)}
		>
			{billingLock ? <BillingLockGate isSuper={role === "super"} /> : null}
			{menuOpen ? (
				<button
					type="button"
					className="fixed inset-0 z-20 border-0 bg-[var(--dialog-backdrop)] md:hidden"
					aria-label="Закрыть меню"
					onClick={() => setMenuOpen(false)}
				/>
			) : null}
			<aside
				className={cx(
					"fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col overflow-auto bg-nav px-3.5 pb-5 pt-7 text-nav-muted transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:w-auto md:translate-x-0 md:px-5",
					menuOpen ? "translate-x-0" : "-translate-x-full",
					collapsed && "md:px-2",
				)}
			>
				<div
					className={cx("flex items-start justify-between gap-2", collapsed && "md:justify-center")}
				>
					<Link
						href="/"
						className={cx(
							"flex items-center gap-2 text-[26px] font-extrabold tracking-[-1.2px] text-[var(--nav-ink)]",
							collapsed && "md:hidden",
						)}
					>
						<span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[22px] leading-none text-[var(--nav-ink)]">
							c
						</span>
						cinema.
					</Link>
					<button
						type="button"
						onClick={toggleCollapsed}
						className="hidden size-8 shrink-0 place-items-center rounded-lg border border-nav-line text-nav-ink md:grid"
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

				{role !== "super" && cinemaName ? (
					<div className={cx("flex items-center gap-3 py-6", collapsed && "md:hidden")}>
						<span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--nav-ink)_16%,transparent)] text-[13px] font-bold text-[var(--nav-ink)]">
							{cinemaName.slice(0, 1).toUpperCase()}
						</span>
						<div className="min-w-0">
							<b className="block truncate text-[13px] text-[var(--nav-ink)]">{cinemaName}</b>
							{cinemaId ? <HallCount cinemaId={cinemaId} /> : null}
						</div>
					</div>
				) : (
					<div className="h-4" />
				)}

				<AdminNav user={user} collapsed={collapsed} onNavigate={() => setMenuOpen(false)} />

				<div
					className={cx(
						"mt-5 flex items-center gap-2.5 border-t border-nav-line pt-5",
						collapsed && "md:justify-center",
					)}
				>
					<span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--nav-ink)_16%,transparent)] text-[13px] font-bold text-[var(--nav-ink)]">
						{initial}
					</span>
					<div className={cx("min-w-0", collapsed && "md:hidden")}>
						<b className="block truncate text-xs text-[var(--nav-ink)]">{user.email ?? "—"}</b>
						<small className="block text-[11px] text-nav-muted">{roleLabel(role)}</small>
					</div>
				</div>
			</aside>
			<div className="min-w-0">
				<HeaderBar onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
				<main className="mx-auto w-full max-w-[1700px] px-[18px] pb-16 pt-6 md:px-9 md:pt-8">
					{role !== "super" && cinemaId ? <ProfileGate user={user} /> : null}
					{children}
				</main>
			</div>
		</div>
	);
}
