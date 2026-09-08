"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "../../../../lib/api";
import { ui } from "../../../../lib/ui";
import { MovieForm } from "../../movie-form";

type Movie = {
	id: string;
	title: string;
	description: string | null;
	posterUrl: string | null;
	durationMin: number;
	rating: number | null;
	ageRating: string | null;
	genres: string[];
	audioLanguages: string[];
	releasedAt: string | null;
};

function toDateInput(value: string | null) {
	if (!value) return "";
	return value.slice(0, 10);
}

export function EditMovieClient({ movie }: { movie: Movie }) {
	const router = useRouter();
	const audio = movie.audioLanguages.filter(
		(x): x is "ru" | "uz" | "en" => x === "ru" || x === "uz" || x === "en",
	);

	return (
		<>
			<h1>Изменить фильм</h1>
			<p className={ui.sub}>{movie.title}</p>
			<MovieForm
				submitLabel="Сохранить"
				initial={{
					title: movie.title,
					description: movie.description ?? "",
					durationMin: movie.durationMin,
					ageRating: movie.ageRating ?? "",
					rating: movie.rating != null ? String(movie.rating) : "",
					genresText: movie.genres.join(", "),
					releasedAt: toDateInput(movie.releasedAt),
					audioLanguages: audio.length > 0 ? audio : ["ru"],
					posterUrl: movie.posterUrl,
				}}
				onSubmit={async (payload) => {
					await clientApi(`/admin/movies/${movie.id}`, {
						method: "PATCH",
						body: JSON.stringify(payload),
					});
					router.push("/movies");
					router.refresh();
				}}
			/>
		</>
	);
}
