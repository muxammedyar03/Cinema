import { Clapperboard, Plus } from "lucide-react";
import Link from "next/link";
import { getMe, serverApi } from "../../lib/server-api";
import { cx, ui } from "../../lib/ui";
import { type MovieListItem, MovieTableRow } from "./movie-table-row";

export default async function MoviesPage() {
	const user = await getMe();
	if (!user) return null;
	const movies = await serverApi<MovieListItem[]>("/admin/movies");
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((s) => s.role === "CINEMA_ADMIN");

	return (
		<>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Фильмы</h1>
					<p className={ui.sub}>Каталог · жанр · озвучка · IMDb · архив</p>
				</div>
				{canManage ? (
					<Link className={cx(ui.btn, ui.btnPri)} href="/movies/new">
						<Plus className="size-4" strokeWidth={2} />
						Фильм
					</Link>
				) : null}
			</div>
			<div className={ui.card}>
				{movies.length === 0 ? (
					<div className="px-5 py-10 text-center text-sm text-muted">
						<Clapperboard className="mx-auto mb-3 size-8 text-faint" strokeWidth={1.4} />
						Фильмов пока нет
					</div>
				) : (
					<table>
						<thead>
							<tr>
								<th>Фильм</th>
								<th>Жанр</th>
								<th>Озвучка</th>
								<th>IMDb</th>
								<th>Выход</th>
								<th>Статус</th>
								{canManage ? <th /> : null}
							</tr>
						</thead>
						<tbody>
							{movies.map((m) => (
								<MovieTableRow key={m.id} movie={m} canManage={canManage} />
							))}
						</tbody>
					</table>
				)}
			</div>
		</>
	);
}
