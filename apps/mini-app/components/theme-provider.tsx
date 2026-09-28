"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { getTelegramWebApp } from "../lib/telegram";

export type Theme = "light" | "dark";

type ThemeContextValue = {
	theme: Theme;
	toggle: () => void;
	setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "cinema-theme";

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute("data-theme", theme);
}

/** Paint Telegram chrome with the active token, without copying themeParams onto the page. */
function syncTelegramChrome() {
	const tg = getTelegramWebApp();
	if (!tg?.setBackgroundColor && !tg?.setHeaderColor) return;
	const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
	if (!bg) return;
	try {
		tg.setBackgroundColor?.(bg);
		tg.setHeaderColor?.(bg);
	} catch {
		/* older WebApp builds reject custom colors */
	}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>("dark");

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial = stored === "light" || stored === "dark" ? stored : "dark";
		setThemeState(initial);
		applyTheme(initial);
		syncTelegramChrome();

		const tg = getTelegramWebApp();
		const onThemeChanged = () => {
			const saved = localStorage.getItem(STORAGE_KEY);
			const next: Theme = saved === "light" || saved === "dark" ? saved : "dark";
			setThemeState(next);
			applyTheme(next);
			syncTelegramChrome();
		};
		try {
			tg?.onEvent?.("themeChanged", onThemeChanged);
		} catch {
			/* WebView without events */
		}
		return () => {
			try {
				tg?.offEvent?.("themeChanged", onThemeChanged);
			} catch {
				/* already detached */
			}
		};
	}, []);

	function setTheme(next: Theme) {
		setThemeState(next);
		localStorage.setItem(STORAGE_KEY, next);
		applyTheme(next);
		syncTelegramChrome();
	}

	function toggle() {
		setTheme(theme === "dark" ? "light" : "dark");
	}

	return (
		<ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
