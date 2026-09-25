import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./page-header.module.css";

export function PageHeader({
	title,
	description,
	actions,
	className,
}: {
	title: string;
	description?: string;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<header className={cx(styles.root, className)}>
			<div>
				<h1 className={styles.title}>{title}</h1>
				{description ? <p className={styles.description}>{description}</p> : null}
			</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</header>
	);
}
