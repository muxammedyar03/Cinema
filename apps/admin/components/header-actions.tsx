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
		"grid size-[34px] place-items-center rounded-lg border-0 bg-transparent text-muted cursor-pointer hover:bg-orange/10 hover:text-orange";

	return (
		<div className="flex gap-1 rounded-[10px] border border-line bg-surface p-1">
			<ThemeToggle className="border-0 bg-transparent" />
			<button type="button" className={iconBtn} title="Уведомления" aria-label="Уведомления">
				<Bell className="size-5" strokeWidth={2} />
			</button>
			<button type="button" className={iconBtn} title="Выход" aria-label="Выход" onClick={logout}>
				<LogOut className="size-5" strokeWidth={2} />
			</button>
		</div>
	);
}
