import { type ButtonSize, type ButtonVariant, buttonClassName } from "@cinema/ui";
import Link from "next/link";
import type { ReactNode } from "react";

export function ButtonLink({
	href,
	variant = "primary",
	size = "medium",
	className,
	children,
}: {
	href: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Link href={href} className={buttonClassName({ variant, size, className })}>
			{children}
		</Link>
	);
}
