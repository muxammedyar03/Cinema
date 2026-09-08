"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "../../../lib/api";
import { cx, ui } from "../../../lib/ui";

export function StatusToggle({
	cinemaId,
	status,
}: {
	cinemaId: string;
	status: "ACTIVE" | "DISABLED";
}) {
	const router = useRouter();
	const next = status === "ACTIVE" ? "DISABLED" : "ACTIVE";
	return (
		<button
			className={cx(ui.btn, ui.btnGhost)}
			type="button"
			onClick={async () => {
				await clientApi(`/admin/cinemas/${cinemaId}/status`, {
					method: "PATCH",
					body: JSON.stringify({ status: next }),
				});
				router.refresh();
			}}
		>
			{status === "ACTIVE" ? "Отключить" : "Включить"}
		</button>
	);
}
