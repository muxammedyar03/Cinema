"use client";

import type { SessionUser } from "@cinema/types";
import {
	Building2,
	Clapperboard,
	Clock3,
	CreditCard,
	KeyRound,
	LayoutDashboard,
	LayoutGrid,
	ListOrdered,
	Receipt,
	ScanLine,
	Ticket,
	Undo2,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { type AppRole, primaryCinemaId, roleOf } from "../lib/rbac";
import { cx } from "../lib/ui";

type NavItem = {
	href: string | ((user: SessionUser) => string);
	label: string;
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	accent: string;
	roles: AppRole[];
	soon?: boolean;
	match?: (pathname: string) => boolean;
};

type NavGroup = {
	label: string;
	tick: string;
	roles: AppRole[];
	items: NavItem[];
};

function hallsHref(user: SessionUser) {
	const id = primaryCinemaId(user);
	return id ? `/halls` : "/cinemas";
}

function isActive(item: NavItem, href: string, pathname: string) {
	if (item.soon) return false;
	if (item.match) return item.match(pathname);
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
	item,
	user,
	pathname,
	groupLabel,
	collapsed,
}: {
	item: NavItem;
	user: SessionUser;
	pathname: string;
	groupLabel: string;
	collapsed: boolean;
}) {
	const Icon = item.icon;
	const href = typeof item.href === "function" ? item.href(user) : item.href;
	const active = isActive(item, href, pathname);
	const cls = cx(
		"relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-[15px] pr-2.5 text-left text-[13.5px] font-medium transition-colors",
		active
			? "bg-white/10 font-semibold text-nav-ink"
			: "text-nav-muted hover:bg-white/8 hover:text-nav-ink",
		item.soon && "cursor-default opacity-55",
		collapsed && "md:justify-center md:px-2 md:pl-2",
	);
	const inner = (
		<>
			<span
				className={cx(
					"absolute bottom-[7px] left-0 top-[7px] w-[3px] rounded-sm transition-opacity",
					active || item.soon ? "opacity-100" : "opacity-0 group-hover:opacity-100",
					collapsed && "md:hidden",
				)}
				style={{ background: item.accent }}
			/>
			<Icon className="size-[17px] shrink-0 opacity-85" strokeWidth={1.6} />
			<span className={cx("flex-1", collapsed && "md:hidden")}>{item.label}</span>
			{item.soon ? (
				<span className={cx("text-[10px] text-nav-muted", collapsed && "md:hidden")}>скоро</span>
			) : null}
		</>
	);
	const key = `${groupLabel}-${item.label}`;
	if (item.soon) {
		return (
			<span key={key} className={cx(cls, "group")} title={item.label}>
				{inner}
			</span>
		);
	}
	return (
		<Link
			key={key}
			href={href}
			className={cx(cls, "group")}
			title={collapsed ? item.label : undefined}
		>
			{inner}
		</Link>
	);
}

const groups: NavGroup[] = [
	{
		label: "Ops",
		tick: "#4c8479",
		roles: ["cinema", "staff"],
		items: [
			{ href: "/", label: "Панель", icon: LayoutDashboard, accent: "#4c8479", roles: ["cinema"] },
			{ href: "/sessions", label: "Сеансы", icon: Clock3, accent: "#4c8479", roles: ["cinema"] },
			{
				href: "/sessions",
				label: "Карта сеанса",
				icon: LayoutGrid,
				accent: "#4c8479",
				roles: ["cinema", "staff"],
				soon: true,
			},
			{
				href: "/m/tickets/verify",
				label: "QR проверка",
				icon: ScanLine,
				accent: "#4c8479",
				roles: ["cinema", "staff"],
				match: (p) => p.startsWith("/m/tickets"),
			},
		],
	},
	{
		label: "Каталог",
		tick: "#e3a63c",
		roles: ["cinema"],
		items: [
			{
				href: "/movies",
				label: "Фильмы",
				icon: Clapperboard,
				accent: "#e3a63c",
				roles: ["cinema"],
			},
			{
				href: hallsHref,
				label: "Залы",
				icon: Building2,
				accent: "#e3a63c",
				roles: ["cinema"],
				match: (p) => p.startsWith("/halls") || /\/cinemas\/[^/]+\/halls/.test(p),
			},
			{
				href: "/profile",
				label: "Профиль",
				icon: KeyRound,
				accent: "#e3a63c",
				roles: ["cinema"],
			},
		],
	},
	{
		label: "Продажи",
		tick: "#7fa66b",
		roles: ["cinema"],
		items: [
			{
				href: "/orders",
				label: "Заказы",
				icon: ListOrdered,
				accent: "#7fa66b",
				roles: ["cinema"],
				match: (p) => p.startsWith("/orders"),
			},
			{
				href: "#",
				label: "Билеты",
				icon: Ticket,
				accent: "#7fa66b",
				roles: ["cinema"],
				soon: true,
			},
			{
				href: "#",
				label: "Возвраты",
				icon: Undo2,
				accent: "#7fa66b",
				roles: ["cinema"],
				soon: true,
			},
			{
				href: "#",
				label: "Отчёты",
				icon: Receipt,
				accent: "#7fa66b",
				roles: ["cinema"],
				soon: true,
			},
		],
	},
	{
		label: "Команда",
		tick: "#9c6b7a",
		roles: ["cinema"],
		items: [
			{ href: "#", label: "Staff", icon: Users, accent: "#9c6b7a", roles: ["cinema"], soon: true },
		],
	},
	{
		label: "Платформа",
		tick: "#7a6b9c",
		roles: ["super"],
		items: [
			{ href: "/", label: "Панель", icon: LayoutDashboard, accent: "#7a6b9c", roles: ["super"] },
			{
				href: "/clients",
				label: "Клиенты",
				icon: Building2,
				accent: "#7a6b9c",
				roles: ["super"],
				match: (p) => p.startsWith("/clients") || p.startsWith("/cinemas"),
			},
			{
				href: "#",
				label: "Админы клиентов",
				icon: KeyRound,
				accent: "#7a6b9c",
				roles: ["super"],
				soon: true,
			},
			{
				href: "/billing",
				label: "Биллинг",
				icon: CreditCard,
				accent: "#7a6b9c",
				roles: ["super"],
				match: (p) => p === "/billing",
			},
			{
				href: "/billing/invoices",
				label: "Инвойсы",
				icon: Receipt,
				accent: "#7a6b9c",
				roles: ["super"],
				match: (p) => p.startsWith("/billing/invoices"),
			},
			{
				href: "/billing/settings",
				label: "Комиссия / notify",
				icon: Wallet,
				accent: "#7a6b9c",
				roles: ["super"],
				match: (p) => p.startsWith("/billing/settings"),
			},
		],
	},
];

export function AdminNav({ user, collapsed = false }: { user: SessionUser; collapsed?: boolean }) {
	const pathname = usePathname();
	const role = roleOf(user);

	return (
		<nav className={cx("flex flex-col gap-0.5", collapsed && "md:items-center")}>
			{groups.map((group) => {
				if (!group.roles.includes(role)) return null;
				const visible = group.items.filter((i) => i.roles.includes(role));
				if (visible.length === 0) return null;
				return (
					<div key={group.label} className={cx(collapsed && "md:w-full")}>
						<div
							className={cx(
								"flex items-center gap-2 px-2.5 pb-1.5 pt-4 text-[11.5px] font-medium text-nav-muted",
								collapsed && "md:justify-center md:px-0 md:pt-3",
							)}
						>
							<span className="size-1.5 shrink-0 rounded-full" style={{ background: group.tick }} />
							<span className={cx(collapsed && "md:hidden")}>{group.label}</span>
						</div>
						{visible.map((item) => (
							<NavLink
								key={`${group.label}-${item.label}`}
								item={item}
								user={user}
								pathname={pathname}
								groupLabel={group.label}
								collapsed={collapsed}
							/>
						))}
					</div>
				);
			})}
		</nav>
	);
}
