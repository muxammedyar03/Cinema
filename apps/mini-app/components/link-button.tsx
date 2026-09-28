import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../lib/ui";

export function LinkButton({
	href,
	children,
	variant = "primary",
	size = "medium",
	className,
}: {
	href: string;
	children: ReactNode;
	variant?: "primary" | "secondary";
	size?: "medium" | "small";
	className?: string;
}) {
	return (
		<Link
			href={href}
			className={cx(
				"v2-btn",
				variant === "secondary" && "v2-btn-secondary",
				size === "small" && "v2-btn-small",
				className,
			)}
		>
			{children}
		</Link>
	);
}
