import Link from "next/link";
import { CinemaChips } from "../components/cinema-chips";
import { MovieCard } from "../components/movie-card";
import { SessionChip } from "../components/session-chip";
import { ThemeToggle } from "../components/theme-toggle";
import { publicApi } from "../lib/api";
import { formatDayLabel, formatDuration, posterGradient } from "../lib/format";
import type { CatalogMovie, CatalogResponse, CatalogSession, PublicCinema } from "../lib/types";
import { cx, ui } from "../lib/ui";

function uniqueMovies(days: CatalogResponse["days"]): CatalogMovie[] {
	const map = new Map<string, CatalogMovie>();
	for (const day of days) {
		for (const movie of day.movies) {
			const prev = map.get(movie.id);
			if (!prev) {
				map.set(movie.id, { ...movie, sessions: [...movie.sessions] });
				continue;
			}
			const seen = new Set(prev.sessions.map((s) => s.id));
			for (const session of movie.sessions) {
				if (!seen.has(session.id)) prev.sessions.push(session);
			}
		}
	}
	return [...map.values()].map((m) => ({
		...m,
		sessions: m.sessions.sort(
			(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
		),
	}));
}

function upcomingSessions(movies: CatalogMovie[], limit = 8): CatalogSession[] {
	return movies
		.flatMap((m) => m.sessions)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		.slice(0, limit);
}

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ cinemaId?: string }>;
}) {
	const { cinemaId } = await searchParams;
	const qs = cinemaId ? `?cinemaId=${encodeURIComponent(cinemaId)}` : "";
	const [cinemas, catalog] = await Promise.all([
		publicApi<PublicCinema[]>("/public/cinemas"),
		publicApi<CatalogResponse>(`/public/catalog${qs}`),
	]);
	const movies = uniqueMovies(catalog.days);
	const hero = movies[0];
	const soon = upcomingSessions(movies);
	const heroBg = hero?.posterUrl ? `url(${hero.posterUrl})` : posterGradient(hero?.id ?? "cinema");

	return (
		<>
			<header className="flex items-center justify-between px-[18px] pt-[18px] pb-2">
				<div className={ui.brand}>Cinema</div>
				<ThemeToggle />
			</header>

			{hero ? (
				<section className="relative mx-3.5 mt-2 min-h-[280px] overflow-hidden rounded-3xl isolation-isolate">
					<div
						className="absolute inset-0 bg-cover bg-center"
						style={{ backgroundImage: heroBg }}
					/>
					<div className="absolute inset-0 z-[1] bg-linear-to-b from-transparent from-20% to-black/88" />
					<div className="relative z-[2] px-[18px] pt-[140px] pb-5">
						<div className="mb-2 text-xs text-muted">
							{formatDuration(hero.durationMin)}
							{hero.ageRating ? ` · ${hero.ageRating}` : ""} · {hero.sessions.length} сеансов
						</div>
						<h1 className="mb-3.5 font-brand text-[30px] font-extrabold leading-[1.05] tracking-tight text-white">
							{hero.title}
						</h1>
						<Link className={ui.cta} href={`/movies/${hero.id}`}>
							Сеансы
						</Link>
					</div>
				</section>
			) : (
				<p className={ui.empty}>
					Пока нет опубликованных сеансов. Admin → сохраните layout → создайте сеанс → Publish.
				</p>
			)}

			<CinemaChips cinemas={cinemas} activeId={cinemaId} />
			{cinemaId ? (
				<p className="-mt-1 mb-3 px-[18px]">
					<Link href={`/cinemas/${cinemaId}`} className="text-[12px] font-semibold text-orange">
						Карта, Instagram и фото →
					</Link>
				</p>
			) : null}

			<section className={ui.section}>
				<div className={ui.sectionHead}>
					<h2 className={ui.sectionTitle}>На этой неделе</h2>
					<span className={ui.sectionMeta}>{movies.length} фильмов</span>
				</div>
				{movies.length === 0 ? (
					<p className={ui.empty}>По выбранному фильтру фильмы не найдены.</p>
				) : (
					<div className={ui.rail}>
						{movies.map((movie) => (
							<MovieCard key={movie.id} movie={movie} />
						))}
					</div>
				)}
			</section>

			{soon.length > 0 ? (
				<section className={ui.section}>
					<div className={ui.sectionHead}>
						<h2 className={ui.sectionTitle}>Ближайшие сеансы</h2>
					</div>
					<div className={ui.sessions}>
						{soon.map((session) => (
							<SessionChip key={session.id} session={session} href={`/sessions/${session.id}`} />
						))}
					</div>
				</section>
			) : null}

			{catalog.days.map((day) => (
				<section key={day.date} className={cx(ui.section, "mb-[18px]")}>
					<h3 className="mb-2.5 text-xs uppercase tracking-[0.08em] text-muted">
						{formatDayLabel(day.date)}
					</h3>
					<div className={ui.rail}>
						{day.movies.map((movie) => (
							<MovieCard key={`${day.date}-${movie.id}`} movie={movie} />
						))}
					</div>
				</section>
			))}
		</>
	);
}
