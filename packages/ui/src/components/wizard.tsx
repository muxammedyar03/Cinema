"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cx } from "../cx";
import { Button } from "./button";
import styles from "./wizard.module.css";

export type WizardStep<T> = {
	id: string;
	title: string;
	subtitle?: string;
	body: (data: T, update: (patch: Partial<T>) => void) => ReactNode;
	validate?: (data: T) => string | null | Promise<string | null>;
};

export function Wizard<T extends object>({
	open,
	title,
	subtitle,
	steps,
	data,
	onChange,
	onSubmit,
	onClose,
	onReset,
	submitLabel = "Сохранить",
}: {
	open: boolean;
	title: string;
	subtitle?: string;
	steps: WizardStep<T>[];
	data: T;
	onChange: (data: T) => void;
	onSubmit: (data: T) => Promise<void>;
	onClose: () => void;
	onReset?: () => void;
	submitLabel?: string;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const [index, setIndex] = useState(0);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const step = steps[index] ?? steps[0];
	const last = index === steps.length - 1;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (open && !el.open) el.showModal();
		if (!open && el.open) el.close();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		setIndex(0);
		setError("");
		setBusy(false);
	}, [open]);

	function update(patch: Partial<T>) {
		onChange({ ...data, ...patch });
		setError("");
	}

	function close() {
		if (busy) return;
		onClose();
	}

	async function next() {
		if (!step || busy) return;
		setBusy(true);
		setError("");
		try {
			const problem = (await step.validate?.(data)) ?? null;
			if (problem) {
				setError(problem);
				return;
			}
			if (!last) {
				setIndex((current) => current + 1);
				return;
			}
			await onSubmit(data);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Не удалось сохранить");
		} finally {
			setBusy(false);
		}
	}

	function back() {
		setError("");
		setIndex((current) => Math.max(0, current - 1));
	}

	function startOver() {
		setError("");
		setIndex(0);
		onReset?.();
	}

	return (
		<dialog
			ref={ref}
			className={styles.dialog}
			aria-labelledby={titleId}
			onClose={onClose}
			onClick={(event) => {
				if (event.target === event.currentTarget) close();
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") close();
			}}
		>
			<div className={styles.frame}>
				<ol className={styles.rail}>
					{steps.map((item, itemIndex) => {
						const active = itemIndex === index;
						const done = itemIndex < index;
						return (
							<li key={item.id}>
								<button
									type="button"
									className={cx(styles.step, active && styles.stepActive, done && styles.stepDone)}
									aria-current={active ? "step" : undefined}
									disabled={itemIndex > index || busy}
									onClick={() => {
										if (itemIndex > index) return;
										setError("");
										setIndex(itemIndex);
									}}
								>
									<span className={styles.index}>{itemIndex + 1}</span>
									<span className={styles.stepTitle}>{item.title}</span>
								</button>
							</li>
						);
					})}
				</ol>
				<div className={styles.main}>
					<div className={styles.head}>
						<div>
							<h2 id={titleId} className={styles.title}>
								{title}
							</h2>
							<p className={styles.subtitle}>{step?.subtitle ?? subtitle}</p>
						</div>
						<button type="button" className={styles.close} onClick={close} aria-label="Закрыть">
							×
						</button>
					</div>
					<div className={styles.body}>
						{step ? step.body(data, update) : null}
						{error ? (
							<p className={styles.error} role="alert">
								{error}
							</p>
						) : null}
					</div>
					<div className={styles.footer}>
						{index > 0 ? (
							<Button variant="secondary" onClick={startOver} disabled={busy}>
								Сначала
							</Button>
						) : (
							<span />
						)}
						<div className={styles.footerActions}>
							<Button variant="secondary" onClick={close} disabled={busy}>
								Отмена
							</Button>
							{index > 0 ? (
								<Button variant="secondary" onClick={back} disabled={busy}>
									Назад
								</Button>
							) : null}
							<Button onClick={() => void next()} disabled={busy}>
								{busy ? "Сохраняем…" : last ? submitLabel : "Далее"}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</dialog>
	);
}

export function WizardSummary({ rows }: { rows: Array<{ label: string; value: string }> }) {
	return (
		<dl className={styles.summary}>
			{rows.map((row) => (
				<div key={row.label}>
					<dt>{row.label}</dt>
					<dd>{row.value || "—"}</dd>
				</div>
			))}
		</dl>
	);
}
