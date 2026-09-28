import { Plus } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "../../components/button-link";
import { QuerySearch } from "../../components/query-search";
import { StatusBadge } from "../../components/status-badge";
import { tashkentDate, tashkentTime } from "../../lib/format";
import { getMe, serverApi } from "../../lib/server-api";
import { languageBadgeLabel } from "../../lib/session-language";
import { Badge, Card, DataTable, PageHeader } from "../../lib/ui-kit";
import { SessionActions } from "./session-actions";
import { SessionFilters } from "./session-filters";

type SessionRow = {
	id: string;
	startsAt: string;
	status: string;
	basePriceUzs: number;
	movie: {
		title: string;
		durationMin?: number;
		ageRating?: string | null;
		posterUrl?: string | null;
	};
	cinema: { name: string };
	hall: { name: string };
	_count: { sessionSeats: number };
	audioLanguage?: string | null;
};

export default async function SessionsPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string; q?: string }>;
}) {
	const user = await getMe();
	if (!user) return null;
	const { status, q } = await searchParams;
	const sessions = await serverApi<SessionRow[]>("/admin/sessions");
	const query = (q ?? "").trim().toLowerCase();
	const filtered = sessions.filter((session) => {
		if (status && status !== "ALL" && session.status !== status) return false;
		if (!query) return true;
		return [session.movie.title, session.hall.name, session.cinema.name]
			.join(" ")
			.toLowerCase()
			.includes(query);
	});
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((member) => member.role === "CINEMA_ADMIN");

	return (
		<>
			<PageHeader
				title="Сеансы"
				description="Планируйте показы и управляйте продажей билетов"
				actions={
					canManage ? (
						<ButtonLink href="/sessions/new">
							<Plus className="size-4" strokeWidth={2} />
							Создать сеанс
						</ButtonLink>
					) : null
				}
			/>
			<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<SessionFilters active={status ?? "ALL"} />
				<QuerySearch placeholder="Поиск по названию" initial={q ?? ""} />
			</div>
			<Card>
				<DataTable
					rows={filtered}
					getRowKey={(session) => session.id}
					emptyTitle="Сеансов нет"
					emptyDescription="Создайте сеанс или измените фильтр."
					columns={[
						{
							id: "movie",
							header: "Фильм",
							cell: (session) => (
								<div className="flex items-center gap-3">
									{session.movie.posterUrl ? (
										<Image
											src={session.movie.posterUrl}
											alt=""
											width={34}
											height={48}
											unoptimized
											className="h-12 w-[34px] rounded object-cover"
										/>
									) : null}
									<div>
										<strong className="text-ink">{session.movie.title}</strong>
										<small className="block text-[11px] text-muted">
											{session.movie.durationMin ? `${session.movie.durationMin} мин` : "—"}
											{session.movie.ageRating ? ` · ${session.movie.ageRating}` : ""}
										</small>
									</div>
								</div>
							),
						},
						{
							id: "time",
							header: "Время",
							cell: (session) => (
								<div>
									<strong className="text-ink">{tashkentTime(session.startsAt)}</strong>
									<small className="block text-[11px] text-muted">
										{tashkentDate(session.startsAt)}
									</small>
								</div>
							),
						},
						{
							id: "hall",
							header: "Зал",
							cell: (session) => {
								const language = languageBadgeLabel(session.audioLanguage);
								return (
									<div className="flex flex-wrap items-center gap-2">
										<span>{session.hall.name}</span>
										{language ? <Badge tone="neutral">{language}</Badge> : null}
									</div>
								);
							},
						},
						{
							id: "seats",
							header: "Места",
							cell: (session) =>
								session._count.sessionSeats > 0 ? (
									session._count.sessionSeats
								) : (
									<Badge tone="blue">Без мест</Badge>
								),
						},
						{
							id: "price",
							header: "Цена",
							cell: (session) => `${session.basePriceUzs.toLocaleString("ru-RU")} сум`,
						},
						{
							id: "status",
							header: "Статус",
							cell: (session) => <StatusBadge status={session.status} />,
						},
						{
							id: "actions",
							header: "",
							cell: (session) =>
								canManage ? <SessionActions id={session.id} status={session.status} /> : null,
						},
					]}
				/>
			</Card>
		</>
	);
}
