import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "medium" | "small";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

export function Button({
	variant = "primary",
	size = "medium",
	className,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cx(
				styles.button,
				variant === "secondary" && styles.secondary,
				size === "small" && styles.small,
				className,
			)}
			{...props}
		/>
	);
}
