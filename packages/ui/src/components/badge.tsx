import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./badge.module.css";

export type BadgeTone = "neutral" | "ok" | "warn" | "bad" | "blue";

export function Badge({
	tone = "neutral",
	children,
	className,
}: {
	tone?: BadgeTone;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span className={cx(styles.badge, tone !== "neutral" && styles[tone], className)}>
			{children}
		</span>
	);
}
