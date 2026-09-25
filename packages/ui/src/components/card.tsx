import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./card.module.css";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
	return <section className={cx(styles.card, className)}>{children}</section>;
}

export function CardHeader({
	title,
	extra,
	children,
}: {
	title?: ReactNode;
	extra?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className={styles.head}>
			{children ?? <h2 className={styles.title}>{title}</h2>}
			{extra}
		</div>
	);
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cx(styles.body, className)}>{children}</div>;
}
