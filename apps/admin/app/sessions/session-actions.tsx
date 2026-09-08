"use client";

import { Ban, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export function SessionActions({ id, status }: { id: string; status: string }) {
	const router = useRouter();
	async function run(path: string) {
		await clientApi(`/admin/sessions/${id}/${path}`, { method: "POST" });
		router.refresh();
	}
	if (status === "DRAFT") {
		return (
			<button
				className={cx(ui.btn, ui.btnSm, ui.btnPri)}
				type="button"
				onClick={() => run("publish")}
			>
				<Check className="size-3.5" strokeWidth={2} />
				Опубликовать
			</button>
		);
	}
	if (status === "PUBLISHED") {
		return (
			<button
				className={cx(ui.btn, ui.btnSm, ui.btnWarn)}
				type="button"
				onClick={() => run("cancel")}
			>
				<Ban className="size-3.5" strokeWidth={2} />
				Отменить
			</button>
		);
	}
	return <span className={cx(ui.badge, ui.badgeMuted)}>{status}</span>;
}
