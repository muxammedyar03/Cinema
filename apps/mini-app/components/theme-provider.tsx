"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

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

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>("dark");

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial = stored === "light" || stored === "dark" ? stored : "dark";
		setThemeState(initial);
		applyTheme(initial);
	}, []);

	function setTheme(next: Theme) {
		setThemeState(next);
		localStorage.setItem(STORAGE_KEY, next);
		applyTheme(next);
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
