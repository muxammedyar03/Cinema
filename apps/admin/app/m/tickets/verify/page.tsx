import { redirect } from "next/navigation";
import { roleOf } from "../../../../lib/rbac";
import { getMe } from "../../../../lib/server-api";
import { TicketVerifyClient } from "./scan-client";

export default async function TicketVerifyPage({
	searchParams,
}: {
	searchParams: Promise<{ c?: string; next?: string }>;
}) {
	const user = await getMe();
	const { c } = await searchParams;
	if (!user) {
		const q = c ? `?c=${encodeURIComponent(c)}` : "";
		redirect(`/login?next=${encodeURIComponent(`/m/tickets/verify${q}`)}`);
	}
	if (roleOf(user) === "super") {
		return (
			<div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
				QR-проверка доступна только сотрудникам кинотеатра (cinema-scoped). Super Admin не сканирует
				билеты клиентов.
			</div>
		);
	}

	return <TicketVerifyClient initialCode={c ?? ""} />;
}
