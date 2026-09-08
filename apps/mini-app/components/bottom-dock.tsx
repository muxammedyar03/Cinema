"use client";

import { Home, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "../lib/ui";

const items = [
	{ href: "/", label: "Home", icon: Home },
	{ href: "/orders", label: "Билеты", icon: Ticket },
] as const;

export function BottomDock() {
	const pathname = usePathname();
	const hide =
		pathname.startsWith("/sessions/") ||
		(pathname.startsWith("/orders/") && pathname !== "/orders");

	if (hide) return null;

	return (
		<nav className="fixed bottom-3 left-1/2 z-40 flex w-[min(320px,calc(100%-28px))] -translate-x-1/2 items-center justify-around gap-1 rounded-full border border-line bg-elev/90 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-[16px]">
			{items.map(({ href, label, icon: Icon }) => {
				const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
				return (
					<Link
						key={href}
						href={href}
						className={cx(
							"flex min-w-[72px] flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-semibold",
							on ? "bg-orange/15 text-orange" : "text-muted",
						)}
					>
						<Icon className="size-4" strokeWidth={2} />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
