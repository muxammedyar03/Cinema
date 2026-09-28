import Image from "next/image";
import Link from "next/link";
import { formatMinutes } from "../lib/format";
import type { CatalogMovie } from "../lib/types";

export function MovieCard({ movie }: { movie: CatalogMovie }) {
	const genre = movie.genres?.find((item) => item.trim());
	const meta = [genre, movie.ageRating, !genre ? formatMinutes(movie.durationMin) : null]
		.filter(Boolean)
		.join(" · ");

	return (
		<Link href={`/movies/${movie.id}`} className="poster-button">
			<div className="poster">
				{movie.posterUrl ? (
					<Image
						className="poster-img"
						src={movie.posterUrl}
						alt=""
						fill
						unoptimized
						sizes="220px"
					/>
				) : (
					<div className="poster-fallback" />
				)}
				{movie.ageRating ? <span className="poster-age">{movie.ageRating}</span> : null}
			</div>
			<b>{movie.title}</b>
			{meta ? <small>{meta}</small> : null}
		</Link>
	);
}
