import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./empty-state.module.css";

export function EmptyState({
	title,
	description,
	action,
	className,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cx(styles.empty, className)}>
			<h2 className={styles.title}>{title}</h2>
			{description ? <p className={styles.description}>{description}</p> : null}
			{action}
		</div>
	);
}
