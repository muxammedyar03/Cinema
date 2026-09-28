"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { clientApi } from "../lib/api";
import { ThemeToggle } from "./theme-toggle";

export function HeaderActions() {
	const router = useRouter();

	async function logout() {
		await clientApi("/auth/logout", { method: "POST" });
		router.push("/login");
		router.refresh();
	}

	const iconBtn =
		"grid size-[38px] place-items-center rounded-lg text-muted hover:bg-elev hover:text-ink";

	return (
		<div className="flex items-center gap-1">
			<ThemeToggle className="border-0 bg-transparent" />
			<button type="button" className={iconBtn} title="Уведомления" aria-label="Уведомления">
				<Bell className="size-5" strokeWidth={1.8} />
			</button>
			<button type="button" className={iconBtn} title="Выход" aria-label="Выход" onClick={logout}>
				<LogOut className="size-5" strokeWidth={1.8} />
			</button>
		</div>
	);
}
