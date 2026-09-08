"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
	const { theme, toggle } = useTheme();
	const label = theme === "dark" ? "Светлая тема" : "Тёмная тема";

	return (
		<button
			type="button"
			className="grid size-[34px] place-items-center rounded-full border border-line bg-elev/60 text-muted cursor-pointer hover:bg-orange/10 hover:text-orange"
			title={label}
			aria-label={label}
			onClick={toggle}
		>
			{theme === "dark" ? (
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					aria-hidden="true"
				>
					<title>Sun</title>
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
				</svg>
			) : (
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					aria-hidden="true"
				>
					<title>Moon</title>
					<path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
				</svg>
			)}
		</button>
	);
}
