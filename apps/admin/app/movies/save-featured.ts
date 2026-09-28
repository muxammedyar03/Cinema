"use client";

import { clientApi } from "../../lib/api";
import {
	FEATURED_SAVE_ERROR,
	featuredAccepted,
	featuredClears,
	OptionalFieldError,
} from "../../lib/featured-film";

type MovieFlag = { id: string; isFeatured?: boolean | null };

async function writeFlag(id: string, isFeatured: boolean) {
	const updated = await clientApi<MovieFlag>(`/admin/movies/${id}`, {
		method: "PATCH",
		body: JSON.stringify({ isFeatured }),
	});
	if (!featuredAccepted(isFeatured, updated)) {
		throw new OptionalFieldError(FEATURED_SAVE_ERROR);
	}
}

/** Turns this film on or off. Turning on clears every other film the API already marks featured. */
export async function saveFeatured(movieId: string, next: boolean, movies: MovieFlag[]) {
	if (next) {
		for (const id of featuredClears(movies, movieId)) {
			await writeFlag(id, false);
		}
	}
	await writeFlag(movieId, next);
}
