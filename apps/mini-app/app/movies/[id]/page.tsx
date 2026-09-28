import { MovieScreen } from "../../../components/movie-screen";
import { publicApi } from "../../../lib/api";
import type { MovieDetail, PublicCinemaProfile } from "../../../lib/types";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const movie = await publicApi<MovieDetail>(`/public/movies/${id}`);
	const cinemaIds = [
		...new Set(
			[movie.cinema?.id, ...movie.sessions.map((session) => session.cinemaId)].filter(
				(value): value is string => Boolean(value),
			),
		),
	];
	const cinemas = (
		await Promise.all(
			cinemaIds.map((cinemaId) =>
				publicApi<PublicCinemaProfile>(`/public/cinemas/${cinemaId}`).catch(() => null),
			),
		)
	).filter((cinema): cinema is PublicCinemaProfile => cinema != null);

	return <MovieScreen movie={movie} cinemas={cinemas} />;
}
