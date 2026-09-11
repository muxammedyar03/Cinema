import type { ReactNode } from "react";
import { LogoutButton } from "../../components/logout-button";
import { ThemeToggle } from "../../components/theme-toggle";

export default function MobileOpsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto min-h-screen max-w-[480px] px-4 pb-10 pt-[max(12px,env(safe-area-inset-top))]">
			<header className="mb-4 flex items-center justify-between gap-3">
				<div>
					<div className="font-brand text-lg font-extrabold tracking-tight">Cinema</div>
					<p className="text-[11px] text-faint">Проверка билетов · мобильный вход</p>
				</div>
				<div className="flex items-center gap-2">
					<ThemeToggle />
					<LogoutButton className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink" />
				</div>
			</header>
			{children}
		</div>
	);
}
