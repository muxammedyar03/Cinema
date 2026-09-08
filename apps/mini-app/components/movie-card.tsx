import Link from "next/link";
import { formatDuration, posterGradient } from "../lib/format";
import type { CatalogMovie } from "../lib/types";

export function MovieCard({ movie }: { movie: CatalogMovie }) {
	const bg = movie.posterUrl ? `url(${movie.posterUrl})` : posterGradient(movie.id + movie.title);
	return (
		<Link href={`/movies/${movie.id}`} className="block">
			<div
				className="relative mb-2 h-44 overflow-hidden rounded-2xl border border-line bg-cover bg-center"
				style={{ backgroundImage: bg }}
			>
				<span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-[7px] py-[3px] text-[10px] font-bold text-white">
					{movie.sessions.length} сеансов
				</span>
			</div>
			<p className="text-[13px] font-semibold leading-tight">{movie.title}</p>
			<small className="text-[11px] text-muted">
				{formatDuration(movie.durationMin)}
				{movie.ageRating ? ` · ${movie.ageRating}` : ""}
			</small>
		</Link>
	);
}
