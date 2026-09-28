import { redirect } from "next/navigation";
import { ButtonLink } from "../../components/button-link";
import { Shell } from "../../components/shell";
import { assertBillingAccess } from "../../lib/billing-access";
import { ruCount } from "../../lib/format";
import { primaryCinemaId, primaryCinemaName, roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { Card, CardBody, EmptyState, PageHeader } from "../../lib/ui-kit";
import { AddHallButton } from "./add-hall-button";
import { HallRowActions } from "./hall-actions";

type Cinema = {
	id: string;
	name: string;
	address: string | null;
	timezone: string;
	halls: Array<{ id: string; name: string; capacity: number }>;
};

type SessionRow = {
	startsAt: string;
	hall: { id: string };
};

function isToday(iso: string) {
	const date = new Date(iso);
	const now = new Date();
	const key = (value: Date) => value.toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
	return key(date) === key(now);
}

export default async function HallsPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	await assertBillingAccess(user);

	const role = roleOf(user);
	if (role === "super") redirect("/cinemas");

	const cinemaId = primaryCinemaId(user);
	if (!cinemaId) redirect("/login");

	const [cinema, sessions] = await Promise.all([
		serverApi<Cinema>(`/admin/cinemas/${cinemaId}`),
		serverApi<SessionRow[]>("/admin/sessions"),
	]);
	const cinemaName = primaryCinemaName(user) ?? cinema.name;
	const canManage = user.staff.some(
		(member) => member.cinemaId === cinemaId && member.role === "CINEMA_ADMIN",
	);
	const todayByHall = new Map<string, number>();
	for (const session of sessions) {
		if (!isToday(session.startsAt)) continue;
		todayByHall.set(session.hall.id, (todayByHall.get(session.hall.id) ?? 0) + 1);
	}

	return (
		<Shell user={user}>
			<PageHeader
				title="Залы"
				description={`${cinemaName}${cinema.address ? ` · ${cinema.address}` : ""} · ${cinema.timezone}`}
				actions={canManage ? <AddHallButton cinemaId={cinema.id} /> : null}
			/>

			{cinema.halls.length === 0 ? (
				<Card>
					<EmptyState title="Залов пока нет" description="Нажмите «Новый зал», чтобы добавить." />
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{cinema.halls.map((hall) => {
						const today = todayByHall.get(hall.id) ?? 0;
						return (
							<Card key={hall.id}>
								<CardBody>
									<h2 className="m-0 text-[21px] font-semibold">{hall.name}</h2>
									<p className="mb-4 mt-1 text-[13px] text-muted">
										{hall.capacity} мест · {today} {ruCount(today, "сеанс", "сеанса", "сеансов")}{" "}
										сегодня · вместимость не равна числу кресел на схеме
									</p>
									<div className="flex flex-wrap items-center gap-2">
										<ButtonLink href={`/cinemas/${cinema.id}/halls/${hall.id}/layout`} size="small">
											Редактировать схему
										</ButtonLink>
										{canManage ? <HallRowActions cinemaId={cinema.id} hall={hall} /> : null}
									</div>
								</CardBody>
							</Card>
						);
					})}
				</div>
			)}
		</Shell>
	);
}
