"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "../../../../lib/api";
import { PageHeader } from "../../../../lib/ui-kit";
import { MovieForm } from "../../movie-form";
import { saveFeatured } from "../../save-featured";

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
	isFeatured?: boolean | null;
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
			<PageHeader title="Изменить фильм" description={movie.title} />
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
					isFeatured: movie.isFeatured === true,
				}}
				onSubmit={async (payload) => {
					const { isFeatured, ...rest } = payload;
					await clientApi(`/admin/movies/${movie.id}`, {
						method: "PATCH",
						body: JSON.stringify(rest),
					});
					if (isFeatured !== undefined) {
						const movies =
							await clientApi<Array<{ id: string; isFeatured?: boolean | null }>>("/admin/movies");
						await saveFeatured(movie.id, isFeatured, movies);
					}
					router.push("/movies");
					router.refresh();
				}}
			/>
		</>
	);
}
