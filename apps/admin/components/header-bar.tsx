"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderActions } from "./header-actions";

type Crumb = { href: string; label: string };

function crumbsFor(pathname: string): Crumb[] {
	if (pathname === "/") return [{ href: "/", label: "Обзор" }];
	if (pathname.startsWith("/m/tickets")) {
		return [{ href: "/m/tickets/verify", label: "Проверка билетов" }];
	}
	if (/\/cinemas\/[^/]+\/halls\/[^/]+\/layout/.test(pathname)) {
		return [
			{ href: "/halls", label: "Залы" },
			{ href: pathname, label: "Редактор зала" },
		];
	}
	if (pathname.startsWith("/sessions/new")) {
		return [
			{ href: "/sessions", label: "Сеансы" },
			{ href: pathname, label: "Новый сеанс" },
		];
	}
	if (pathname.startsWith("/sessions")) return [{ href: "/sessions", label: "Сеансы" }];
	if (pathname.startsWith("/movies/new")) {
		return [
			{ href: "/movies", label: "Фильмы" },
			{ href: pathname, label: "Новый фильм" },
		];
	}
	if (/^\/movies\/[^/]+\/edit/.test(pathname)) {
		return [
			{ href: "/movies", label: "Фильмы" },
			{ href: pathname, label: "Редактирование" },
		];
	}
	if (pathname.startsWith("/movies")) return [{ href: "/movies", label: "Фильмы" }];
	if (pathname.startsWith("/halls")) return [{ href: "/halls", label: "Залы" }];
	if (/^\/orders\/[^/]+/.test(pathname)) {
		return [
			{ href: "/orders", label: "Заказы" },
			{ href: pathname, label: "Заказ" },
		];
	}
	if (pathname.startsWith("/orders")) return [{ href: "/orders", label: "Заказы" }];
	if (pathname.startsWith("/profile")) return [{ href: "/profile", label: "Профиль" }];
	if (pathname.startsWith("/billing/locked")) {
		return [{ href: "/billing/locked", label: "Доступ ограничен" }];
	}
	if (pathname.startsWith("/billing/invoices")) {
		return [
			{ href: "/billing", label: "Биллинг" },
			{ href: pathname, label: "Инвойсы" },
		];
	}
	if (pathname.startsWith("/billing/settings")) {
		return [
			{ href: "/billing", label: "Биллинг" },
			{ href: pathname, label: "Комиссия" },
		];
	}
	if (pathname.startsWith("/billing")) return [{ href: "/billing", label: "Биллинг" }];
	if (pathname === "/cinemas/new") {
		return [
			{ href: "/cinemas", label: "Кинотеатры" },
			{ href: pathname, label: "Новый кинотеатр" },
		];
	}
	if (pathname === "/cinemas") return [{ href: "/cinemas", label: "Кинотеатры" }];
	if (pathname.startsWith("/cinemas")) {
		return [
			{ href: "/cinemas", label: "Кинотеатры" },
			{ href: pathname, label: "Кинотеатр" },
		];
	}
	if (pathname === "/clients/new") {
		return [
			{ href: "/clients", label: "Администраторы" },
			{ href: pathname, label: "Новый клиент" },
		];
	}
	if (/^\/clients\/[^/]+\/edit/.test(pathname)) {
		return [
			{ href: "/clients", label: "Администраторы" },
			{ href: pathname, label: "Редактирование" },
		];
	}
	if (/^\/clients\/[^/]+\/profile/.test(pathname)) {
		return [
			{ href: "/clients", label: "Администраторы" },
			{ href: pathname, label: "Профиль" },
		];
	}
	if (/^\/clients\/[^/]+/.test(pathname)) {
		return [
			{ href: "/clients", label: "Администраторы" },
			{ href: pathname, label: "Карточка" },
		];
	}
	if (pathname.startsWith("/clients")) {
		return [{ href: "/clients", label: "Администраторы" }];
	}
	return [{ href: pathname, label: "Раздел" }];
}

export function HeaderBar({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
	const pathname = usePathname();
	const crumbs = crumbsFor(pathname);

	return (
		<header className="sticky top-0 z-10 flex h-[66px] items-center justify-between gap-3 border-b border-line bg-panel px-[18px] md:h-20 md:px-9">
			<div className="flex min-w-0 items-center gap-3">
				<button
					type="button"
					className="grid size-10 place-items-center rounded-lg border border-line text-ink md:hidden"
					aria-label="Открыть меню"
					aria-expanded={menuOpen}
					onClick={onMenu}
				>
					<Menu className="size-5" strokeWidth={1.8} />
				</button>
				<nav aria-label="Хлебные крошки" className="truncate text-xs text-muted">
					<span>Панель</span>
					{crumbs.map((crumb, index) => {
						const last = index === crumbs.length - 1;
						return (
							<span key={`${crumb.href}-${crumb.label}`}>
								<span className="px-2 text-[var(--line-strong)] md:px-3.5">/</span>
								{last ? (
									<b className="font-medium text-ink">{crumb.label}</b>
								) : (
									<Link href={crumb.href} className="hover:text-ink">
										{crumb.label}
									</Link>
								)}
							</span>
						);
					})}
				</nav>
			</div>
			<HeaderActions />
		</header>
	);
}
