import { PageHeader } from "@cinema/ui";
import { Clapperboard } from "lucide-react";
import Image from "next/image";
import { getMe, serverApi } from "../../lib/server-api";
import { NewSessionAction } from "../sessions/new-session-action";
import { MovieRowActions } from "./movie-actions";
import { type MovieListItem } from "./movie-table-row";
import { NewMovieAction } from "./new-movie-action";

function movieMeta(movie: MovieListItem) {
	return [movie.genres[0], `${movie.durationMin} мин`, movie.ageRating].filter(Boolean).join(" · ");
}

export default async function MoviesPage() {
	const user = await getMe();
	if (!user) return null;
	const movies = await serverApi<MovieListItem[]>("/admin/movies");
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((s) => s.role === "CINEMA_ADMIN");

	return (
		<>
			<PageHeader
				title="Фильмы"
				description="Каталог вашего кинотеатра"
				actions={canManage ? <NewMovieAction /> : null}
			/>
			{movies.length === 0 ? (
				<div className="rounded-xl border border-line bg-white dark:bg-gray-800 px-5 py-10 text-center text-sm text-[#78859c]">
					<Clapperboard className="mx-auto mb-3 size-8" strokeWidth={1.4} />
					Фильмов пока нет
				</div>
			) : (
				<div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4 mb-20">
					{movies.map((movie) => (
						<article
							key={movie.id}
							className={`relative min-w-72 rounded-xl border border-line bg-white focus-within:z-10 dark:bg-gray-800 ${movie.status === "ARCHIVED" ? "opacity-60" : ""}`}
						>
							<div className="overflow-hidden rounded-t-xl">
								{movie.posterUrl ? (
									<Image
										src={movie.posterUrl}
										alt=""
										width={640}
										height={840}
										unoptimized
										className="h-[350px] w-full object-cover object-[center_25%]"
									/>
								) : (
									<div className="grid h-[280px] place-items-center bg-[#eef2fa] text-[#8a97ad]">
										<Clapperboard className="size-10" strokeWidth={1.4} />
									</div>
								)}
							</div>
							<div className="p-5">
								<h2 className="text-[19px] font-semibold text-[#19253d]">{movie.title}</h2>
								<p className="mt-1.5 mb-4 text-[13px] text-[#8794a7]">{movieMeta(movie)}</p>
								{canManage ? (
									<div className="flex items-center gap-2">
										{movie.status === "ACTIVE" ? (
											<div className="min-w-0 flex-1">
												<NewSessionAction variant="card" movieId={movie.id} />
											</div>
										) : null}
										<MovieRowActions movie={movie} />
									</div>
								) : null}
							</div>
						</article>
					))}
				</div>
			)}
		</>
	);
}
