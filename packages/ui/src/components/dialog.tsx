"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import styles from "./dialog.module.css";

export function Dialog({
	open,
	title,
	children,
	onClose,
	actions,
}: {
	open: boolean;
	title: string;
	children: ReactNode;
	onClose: () => void;
	actions?: ReactNode;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (open && !el.open) el.showModal();
		if (!open && el.open) el.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			className={styles.dialog}
			aria-labelledby={titleId}
			onClose={onClose}
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
		>
			<div className={styles.head}>
				<h2 id={titleId} className={styles.title}>
					{title}
				</h2>
				<button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
					×
				</button>
			</div>
			<div className={styles.body}>{children}</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</dialog>
	);
}
