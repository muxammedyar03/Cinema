import Link from "next/link";
import { SessionChip } from "../../../components/session-chip";
import { publicApi } from "../../../lib/api";
import { formatDuration, formatPrice, posterGradient } from "../../../lib/format";
import type { MovieDetail } from "../../../lib/types";
import { cx, ui } from "../../../lib/ui";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const movie = await publicApi<MovieDetail>(`/public/movies/${id}`);
	const sessions = movie.sessions.sort(
		(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
	);
	const first = sessions[0];
	const bg = movie.posterUrl ? `url(${movie.posterUrl})` : posterGradient(movie.id + movie.title);

	return (
		<>
			<div className="relative h-[280px] overflow-hidden">
				<div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: bg }} />
				<Link
					href="/"
					className={cx(ui.backFab, "absolute top-4 left-3.5 z-[2]")}
					aria-label="Назад"
				>
					←
				</Link>
			</div>
			<div className="relative z-[1] -mt-7 rounded-t-[28px] border-t border-line bg-linear-to-b from-elev/95 to-bg to-40% px-[18px] pt-[22px] pb-10">
				<h1 className="mb-2 font-brand text-[28px] font-extrabold tracking-tight">{movie.title}</h1>
				<div className="mb-3.5 flex flex-wrap gap-2 text-[13px] text-muted">
					{movie.rating != null ? <span>IMDb {movie.rating.toFixed(1)}</span> : null}
					<span>{formatDuration(movie.durationMin)}</span>
					{movie.ageRating ? <span>{movie.ageRating}</span> : null}
					{movie.genres?.length ? <span>{movie.genres.join(", ")}</span> : null}
					{movie.audioLanguages?.length ? (
						<span>
							{movie.audioLanguages
								.map((a) => (a === "ru" ? "RU" : a === "uz" ? "UZ" : a === "en" ? "EN" : a))
								.join(" · ")}
						</span>
					) : null}
					{movie.releasedAt ? <span>{new Date(movie.releasedAt).getFullYear()}</span> : null}
					<span>{sessions.length} сеансов</span>
				</div>
				<p className="mb-[18px] text-sm leading-[1.55] text-muted">
					{movie.description ??
						"Сеансы во всех активных кинотеатрах. Бронирование мест — в следующей фазе."}
				</p>
				{sessions.length === 0 ? (
					<p className={ui.empty}>Для этого фильма пока нет опубликованных сеансов.</p>
				) : (
					<>
						<div className={ui.sessions}>
							{sessions.map((session, i) => (
								<SessionChip
									key={session.id}
									session={session}
									href={`/sessions/${session.id}`}
									active={i === 0}
								/>
							))}
						</div>
						{first ? (
							<>
								<div className="my-[18px] mb-3.5 flex items-baseline gap-2.5">
									<span className="text-[22px] font-bold">{formatPrice(first.basePriceUzs)}</span>
								</div>
								<Link className={cx(ui.cta, ui.ctaBlock)} href={`/sessions/${first.id}`}>
									Карта мест
								</Link>
							</>
						) : null}
					</>
				)}
			</div>
		</>
	);
}
