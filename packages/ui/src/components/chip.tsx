import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";
import styles from "./chip.module.css";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	active?: boolean;
};

export function Chip({ active = false, className, type = "button", ...props }: ChipProps) {
	return (
		<button
			type={type}
			className={cx(styles.chip, active && styles.active, className)}
			aria-pressed={active}
			{...props}
		/>
	);
}
