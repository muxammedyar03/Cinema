"use client";

import type { SessionUser } from "@cinema/types";
import {
	Building2,
	Clapperboard,
	Clock3,
	CreditCard,
	KeyRound,
	LayoutDashboard,
	ListOrdered,
	Receipt,
	ScanLine,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { type AppRole, roleOf } from "../lib/rbac";
import { cx } from "../lib/ui";

type NavItem = {
	href: string;
	label: string;
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	roles: AppRole[];
	match: (pathname: string) => boolean;
};

type NavGroup = {
	label: string;
	roles: AppRole[];
	items: NavItem[];
};

const groups: NavGroup[] = [
	{
		label: "Рабочий день",
		roles: ["cinema", "staff"],
		items: [
			{
				href: "/",
				label: "Обзор",
				icon: LayoutDashboard,
				roles: ["cinema"],
				match: (pathname) => pathname === "/",
			},
			{
				href: "/sessions",
				label: "Сеансы",
				icon: Clock3,
				roles: ["cinema"],
				match: (pathname) => pathname.startsWith("/sessions"),
			},
			{
				href: "/m/tickets/verify",
				label: "Проверка билетов",
				icon: ScanLine,
				roles: ["cinema", "staff"],
				match: (pathname) => pathname.startsWith("/m/tickets"),
			},
		],
	},
	{
		label: "Управление",
		roles: ["cinema"],
		items: [
			{
				href: "/movies",
				label: "Фильмы",
				icon: Clapperboard,
				roles: ["cinema"],
				match: (pathname) => pathname.startsWith("/movies"),
			},
			{
				href: "/halls",
				label: "Залы",
				icon: Building2,
				roles: ["cinema"],
				match: (pathname) =>
					pathname.startsWith("/halls") || /\/cinemas\/[^/]+\/halls/.test(pathname),
			},
			{
				href: "/orders",
				label: "Заказы",
				icon: ListOrdered,
				roles: ["cinema"],
				match: (pathname) => pathname.startsWith("/orders"),
			},
			{
				href: "/profile",
				label: "Профиль",
				icon: KeyRound,
				roles: ["cinema"],
				match: (pathname) => pathname.startsWith("/profile"),
			},
		],
	},
	{
		label: "Платформа",
		roles: ["super"],
		items: [
			{
				href: "/",
				label: "Обзор",
				icon: LayoutDashboard,
				roles: ["super"],
				match: (pathname) => pathname === "/",
			},
			{
				href: "/clients",
				label: "Клиенты",
				icon: Building2,
				roles: ["super"],
				match: (pathname) => pathname.startsWith("/clients") || pathname.startsWith("/cinemas"),
			},
			{
				href: "/billing",
				label: "Биллинг",
				icon: CreditCard,
				roles: ["super"],
				match: (pathname) => pathname === "/billing",
			},
			{
				href: "/billing/invoices",
				label: "Инвойсы",
				icon: Receipt,
				roles: ["super"],
				match: (pathname) => pathname.startsWith("/billing/invoices"),
			},
			{
				href: "/billing/settings",
				label: "Комиссия",
				icon: Wallet,
				roles: ["super"],
				match: (pathname) => pathname.startsWith("/billing/settings"),
			},
		],
	},
];

export function AdminNav({
	user,
	collapsed = false,
	onNavigate,
}: {
	user: SessionUser;
	collapsed?: boolean;
	onNavigate?: () => void;
}) {
	const pathname = usePathname();
	const role = roleOf(user);

	return (
		<nav className="flex flex-1 flex-col" aria-label="Разделы">
			{groups.map((group) => {
				if (!group.roles.includes(role)) return null;
				const visible = group.items.filter((item) => item.roles.includes(role));
				if (visible.length === 0) return null;
				return (
					<div key={group.label}>
						<div
							className={cx(
								"px-3 pb-2 pt-5 text-[10px] font-medium uppercase tracking-[1.4px] text-nav-muted",
								collapsed && "md:px-0 md:text-center",
							)}
						>
							<span className={cx(collapsed && "md:hidden")}>{group.label}</span>
						</div>
						{visible.map((item) => {
							const Icon = item.icon;
							const active = item.match(pathname);
							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									title={collapsed ? item.label : undefined}
									onClick={onNavigate}
									className={cx(
										"mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-[11px] text-left text-[13px] font-medium text-nav-muted transition-colors hover:bg-[color-mix(in_srgb,var(--nav-ink)_8%,transparent)] hover:text-[var(--nav-ink)]",
										active && "bg-primary font-semibold text-[var(--nav-ink)] hover:bg-primary",
										collapsed && "md:justify-center md:px-2",
									)}
								>
									<Icon className="size-[18px] shrink-0" strokeWidth={1.7} />
									<span className={cx("flex-1", collapsed && "md:hidden")}>{item.label}</span>
								</Link>
							);
						})}
					</div>
				);
			})}
		</nav>
	);
}
