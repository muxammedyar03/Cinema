import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./metric-card.module.css";

export type MetricCardVariant = "default" | "primary";

export function MetricCard({
	label,
	value,
	hint,
	variant = "default",
	className,
}: {
	label: ReactNode;
	value: ReactNode;
	hint?: ReactNode;
	variant?: MetricCardVariant;
	className?: string;
}) {
	return (
		<article className={cx(styles.metric, variant === "primary" && styles.primary, className)}>
			<div className={styles.label}>{label}</div>
			<b className={styles.value}>{value}</b>
			{hint ? <small className={styles.hint}>{hint}</small> : null}
		</article>
	);
}
