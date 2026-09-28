"use client";

import { Clapperboard, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "../lib/ui";
import { dockHidden } from "./app-shell";

const items = [
	{ href: "/", label: "Афиша", icon: Clapperboard },
	{ href: "/orders", label: "Мои билеты", icon: Ticket },
	{ href: "/profile", label: "Профиль", icon: UserRound },
] as const;

export function BottomDock() {
	const pathname = usePathname();
	if (dockHidden(pathname)) return null;

	return (
		<nav className="dock" aria-label="Навигация">
			{items.map(({ href, label, icon: Icon }) => {
				const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
				return (
					<Link
						key={href}
						href={href}
						className={cx(on && "active")}
						aria-current={on ? "page" : undefined}
					>
						<Icon size={22} strokeWidth={1.8} aria-hidden />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
