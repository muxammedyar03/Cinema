import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "medium" | "small";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

export function buttonClassName({
	variant = "primary",
	size = "medium",
	className,
}: {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
}) {
	return cx(
		styles.button,
		variant === "secondary" && styles.secondary,
		variant === "danger" && styles.danger,
		size === "small" && styles.small,
		className,
	);
}

export function Button({
	variant = "primary",
	size = "medium",
	className,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button type={type} className={buttonClassName({ variant, size, className })} {...props} />
	);
}
