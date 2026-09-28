import { Clapperboard, Plus } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "../../components/button-link";
import { StatusBadge } from "../../components/status-badge";
import { featuredBadgeVisible } from "../../lib/featured-film";
import { getMe, serverApi } from "../../lib/server-api";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "../../lib/ui-kit";
import { FeaturedSwitch } from "./featured-switch";
import { MovieRowActions } from "./movie-actions";
import type { MovieListItem } from "./movie-table-row";

const AUDIO_LABEL: Record<string, string> = {
	ru: "Русский",
	uz: "Узбекский",
	en: "Английский",
};

export default async function MoviesPage() {
	const user = await getMe();
	if (!user) return null;
	const movies = await serverApi<MovieListItem[]>("/admin/movies");
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((member) => member.role === "CINEMA_ADMIN");

	return (
		<>
			<PageHeader
				title="Фильмы"
				description="Каталог вашего кинотеатра"
				actions={
					canManage ? (
						<ButtonLink href="/movies/new">
							<Plus className="size-4" strokeWidth={2} />
							Фильм
						</ButtonLink>
					) : null
				}
			/>
			{movies.length === 0 ? (
				<Card>
					<EmptyState title="Фильмов пока нет" description="Добавьте первый фильм в каталог." />
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{movies.map((movie) => (
						<Card key={movie.id} className={movie.status === "ARCHIVED" ? "opacity-70" : undefined}>
							{movie.posterUrl ? (
								<Image
									src={movie.posterUrl}
									alt={movie.title}
									width={640}
									height={840}
									unoptimized
									className="h-[220px] w-full object-cover sm:h-[280px]"
								/>
							) : (
								<div className="grid h-[220px] place-items-center bg-elev text-faint sm:h-[280px]">
									<Clapperboard className="size-8" strokeWidth={1.4} />
								</div>
							)}
							<CardBody>
								<div className="mb-2 flex flex-wrap items-center gap-2">
									<h2 className="m-0 text-[19px] font-semibold">{movie.title}</h2>
									<StatusBadge status={movie.status} />
									{featuredBadgeVisible(movie) ? (
										<Badge tone="blue">В центре внимания</Badge>
									) : null}
								</div>
								{canManage ? (
									<FeaturedSwitch
										movieId={movie.id}
										featured={movie.isFeatured === true}
										others={movies}
									/>
								) : null}
								<p className="m-0 text-[13px] text-muted">
									{movie.genres.length > 0 ? movie.genres.join(", ") : "Жанр не указан"}
									{" · "}
									{movie.durationMin} мин
									{movie.ageRating ? ` · ${movie.ageRating}` : ""}
								</p>
								<p className="mb-4 mt-2 text-[12px] text-muted">
									Озвучка:{" "}
									{movie.audioLanguages.length > 0
										? movie.audioLanguages.map((code) => AUDIO_LABEL[code] ?? code).join(", ")
										: "—"}
									{" · "}
									IMDb {movie.rating != null ? movie.rating.toFixed(1) : "—"}
									{" · "}
									Выход{" "}
									{movie.releasedAt ? new Date(movie.releasedAt).toLocaleDateString("ru-RU") : "—"}
								</p>
								{canManage ? (
									<div className="flex flex-wrap gap-2">
										<ButtonLink
											href={`/sessions/new?movie=${movie.id}`}
											variant="secondary"
											size="small"
										>
											Создать сеанс
										</ButtonLink>
										<MovieRowActions movie={movie} />
									</div>
								) : null}
							</CardBody>
						</Card>
					))}
				</div>
			)}
		</>
	);
}
