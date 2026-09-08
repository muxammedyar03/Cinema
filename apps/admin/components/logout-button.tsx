"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "../lib/api";
import { cx } from "../lib/ui";

export function LogoutButton({ className }: { className?: string }) {
	const router = useRouter();
	return (
		<button
			className={cx("link", className)}
			type="button"
			onClick={async () => {
				await clientApi("/auth/logout", { method: "POST" });
				router.push("/login");
				router.refresh();
			}}
		>
			Выход
		</button>
	);
}
