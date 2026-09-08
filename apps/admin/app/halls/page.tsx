import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../components/shell";
import { assertBillingAccess } from "../../lib/billing-access";
import { primaryCinemaId, primaryCinemaName, roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { cx, ui } from "../../lib/ui";
import { AddHallButton } from "./add-hall-button";
import { HallRowActions } from "./hall-actions";

type Cinema = {
	id: string;
	name: string;
	address: string | null;
	timezone: string;
	halls: Array<{ id: string; name: string; capacity: number }>;
};

export default async function HallsPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	await assertBillingAccess(user);

	const role = roleOf(user);
	if (role === "super") redirect("/cinemas");

	const cinemaId = primaryCinemaId(user);
	if (!cinemaId) redirect("/login");

	const cinema = await serverApi<Cinema>(`/admin/cinemas/${cinemaId}`);
	const cinemaName = primaryCinemaName(user) ?? cinema.name;
	const canManage = user.staff.some((s) => s.cinemaId === cinemaId && s.role === "CINEMA_ADMIN");

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Залы</h1>
					<p className={ui.sub}>
						{cinemaName}
						{cinema.address ? ` · ${cinema.address}` : ""} · {cinema.timezone}
					</p>
				</div>
				{canManage ? <AddHallButton cinemaId={cinema.id} /> : null}
			</div>

			{cinema.halls.length === 0 ? (
				<div className={ui.card}>
					<p className="px-5 py-10 text-center text-sm text-muted">
						Залов пока нет. Нажмите «Новый зал», чтобы добавить.
					</p>
				</div>
			) : (
				<div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{cinema.halls.map((h) => (
						<div key={h.id} className={cx(ui.card, "p-[18px]")}>
							<h2 className="mb-1.5 font-brand text-lg font-bold">{h.name}</h2>
							<p className="mb-3.5 text-[13px] text-muted">
								Вместимость {h.capacity} · capacity ≠ число кресел
							</p>
							<div className="mb-3 flex flex-wrap gap-2">
								<Link
									className={cx(ui.btn, ui.btnSm, ui.btnPri)}
									href={`/cinemas/${cinema.id}/halls/${h.id}/layout`}
								>
									<LayoutTemplate className="size-3.5" strokeWidth={2} />
									Схема
								</Link>
							</div>
							{canManage ? <HallRowActions cinemaId={cinema.id} hall={h} /> : null}
						</div>
					))}
				</div>
			)}
		</Shell>
	);
}
