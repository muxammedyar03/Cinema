"use client";

import { cx } from "../cx";
import styles from "./segmented-control.module.css";

export type SegmentedOption<T extends string> = {
	value: T;
	label: string;
};

export function SegmentedControl<T extends string>({
	value,
	options,
	onChange,
	ariaLabel,
}: {
	value: T;
	options: SegmentedOption<T>[];
	onChange: (value: T) => void;
	ariaLabel: string;
}) {
	return (
		<fieldset className={styles.root} aria-label={ariaLabel}>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						className={cx(styles.item, selected && styles.active)}
						aria-pressed={selected}
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</button>
				);
			})}
		</fieldset>
	);
}
