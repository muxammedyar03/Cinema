"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { telegramDisplayName } from "../lib/telegram";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
	const [letter, setLetter] = useState<string | null>(null);

	useEffect(() => {
		const name = telegramDisplayName();
		setLetter(name ? name.charAt(0).toUpperCase() : null);
	}, []);

	return (
		<header className="app-header">
			<Link href="/" className="logo">
				cinema<span>.</span>
			</Link>
			<div className="header-actions">
				<ThemeToggle />
				<Link href="/profile" className="profile-button" aria-label="Профиль">
					{letter ?? <User size={16} strokeWidth={1.8} aria-hidden />}
				</Link>
			</div>
		</header>
	);
}
