import { Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { getMe, serverApi } from "../../lib/server-api";
import { cx, ui } from "../../lib/ui";
import { SessionActions } from "./session-actions";
import { SessionFilters } from "./session-filters";

type SessionRow = {
	id: string;
	startsAt: string;
	status: string;
	basePriceUzs: number;
	movie: { title: string };
	cinema: { name: string };
	hall: { name: string };
	_count: { sessionSeats: number };
};

export default async function SessionsPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string }>;
}) {
	const user = await getMe();
	if (!user) return null;
	const { status } = await searchParams;
	const sessions = await serverApi<SessionRow[]>("/admin/sessions");
	const filtered =
		status && status !== "ALL" ? sessions.filter((s) => s.status === status) : sessions;
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((s) => s.role === "CINEMA_ADMIN");

	return (
		<>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Сеансы</h1>
					<p className={ui.sub}>Цена и скидка относятся к сеансу · фильм — отдельная сущность</p>
				</div>
				{canManage ? (
					<Link className={cx(ui.btn, ui.btnPri)} href="/sessions/new">
						<Plus className="size-4" strokeWidth={2} />
						Создать сеанс
					</Link>
				) : null}
			</div>
			<SessionFilters active={status ?? "ALL"} />
			<div className={ui.card}>
				<div className={ui.cardH}>
					<span>Список</span>
					<span className="font-mono text-xs font-medium text-muted">{filtered.length}</span>
				</div>
				{filtered.length === 0 ? (
					<div className="px-5 py-10 text-center text-sm text-muted">
						<Clock3 className="mx-auto mb-3 size-8 text-faint" strokeWidth={1.4} />
						Сеансов нет
					</div>
				) : (
					<table>
						<thead>
							<tr>
								<th>Дата</th>
								<th>Время</th>
								<th>Фильм</th>
								<th>Зал</th>
								<th>Цена</th>
								<th>Места</th>
								<th>Статус</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.map((s) => {
								const d = new Date(s.startsAt);
								return (
									<tr key={s.id} className="clickable">
										<td>
											{d.toLocaleDateString("ru-RU", {
												day: "numeric",
												month: "short",
												timeZone: "Asia/Tashkent",
											})}
										</td>
										<td>
											{d.toLocaleTimeString("ru-RU", {
												hour: "2-digit",
												minute: "2-digit",
												timeZone: "Asia/Tashkent",
											})}
										</td>
										<td>
											<b>{s.movie.title}</b>
											<div className="mt-0.5 font-ui text-xs text-muted">{s.cinema.name}</div>
										</td>
										<td>{s.hall.name}</td>
										<td>{s.basePriceUzs.toLocaleString("ru-RU")}</td>
										<td>
											{s._count.sessionSeats > 0 ? (
												s._count.sessionSeats
											) : (
												<span className={cx(ui.badge, ui.badgeOrange)}>GA</span>
											)}
										</td>
										<td>
											<span
												className={cx(
													ui.badge,
													s.status === "PUBLISHED"
														? ui.badgeOk
														: s.status === "CANCELLED"
															? ui.badgeBad
															: ui.badgeMuted,
												)}
											>
												{s.status}
											</span>
										</td>
										<td className="text-right">
											{canManage ? <SessionActions id={s.id} status={s.status} /> : null}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</>
	);
}
