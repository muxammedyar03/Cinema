"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
	const { theme, toggle } = useTheme();
	const label = theme === "dark" ? "Светлая тема" : "Тёмная тема";

	return (
		<button type="button" className="icon-button" title={label} aria-label={label} onClick={toggle}>
			{theme === "dark" ? (
				<Sun size={16} strokeWidth={1.8} />
			) : (
				<Moon size={16} strokeWidth={1.8} />
			)}
		</button>
	);
}
