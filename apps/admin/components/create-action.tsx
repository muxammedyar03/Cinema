"use client";

import { type ButtonSize, buttonClassName } from "@cinema/ui";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./create-banner.module.css";

export function CreateBanner({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action: ReactNode;
}) {
	return (
		<div className={styles.banner}>
			<div className={styles.copy}>
				<h2 className={styles.title}>{title}</h2>
				{description ? <p className={styles.text}>{description}</p> : null}
			</div>
			<div className={styles.action}>{action}</div>
		</div>
	);
}

export function CreateAction({
	label,
	href,
	onClick,
	size = "medium",
}: {
	label: string;
	href?: string;
	onClick?: () => void;
	size?: ButtonSize;
}) {
	const className = buttonClassName({ size });
	const content = (
		<>
			<Plus className={size === "small" ? "size-3.5" : "size-4"} strokeWidth={2.2} aria-hidden />
			{label}
		</>
	);
	if (href) {
		return (
			<Link href={href} className={className}>
				{content}
			</Link>
		);
	}
	return (
		<button type="button" className={className + " !py-3 !px-4 !rounded-lg"} onClick={onClick}>
			{content}
		</button>
	);
}
