"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
	const { theme, toggle } = useTheme();
	const label = theme === "dark" ? "Светлая тема" : "Тёмная тема";

	return (
		<button
			type="button"
			onClick={toggle}
			title={label}
			aria-label={label}
			className={`grid size-[34px] place-items-center rounded-lg border border-line bg-elev/60 text-muted hover:bg-orange/10 hover:text-orange ${className}`}
		>
			{theme === "dark" ? (
				<Sun className="size-6" strokeWidth={2} />
			) : (
				<Moon className="size-6" strokeWidth={1.8} />
			)}
		</button>
	);
}
