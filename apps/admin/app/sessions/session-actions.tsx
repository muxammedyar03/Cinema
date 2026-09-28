"use client";

import { Ban, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { clientApi } from "../../lib/api";
import { Button } from "../../lib/ui-kit";

export function SessionActions({ id, status }: { id: string; status: string }) {
	const router = useRouter();
	async function run(path: string) {
		await clientApi(`/admin/sessions/${id}/${path}`, { method: "POST" });
		router.refresh();
	}
	if (status === "DRAFT") {
		return (
			<Button size="small" type="button" onClick={() => run("publish")}>
				<Check className="size-3.5" strokeWidth={2} />
				Опубликовать
			</Button>
		);
	}
	if (status === "PUBLISHED") {
		return (
			<Button size="small" variant="danger" type="button" onClick={() => run("cancel")}>
				<Ban className="size-3.5" strokeWidth={2} />
				Отменить
			</Button>
		);
	}
	return null;
}
