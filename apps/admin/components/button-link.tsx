import type { ButtonSize, ButtonVariant } from "@cinema/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClassName } from "../lib/ui-kit";

export function ButtonLink({
	href,
	children,
	variant = "primary",
	size = "medium",
	className,
}: {
	href: string;
	children: ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
}) {
	return (
		<Link href={href} className={buttonClassName({ variant, size, className })}>
			{children}
		</Link>
	);
}
