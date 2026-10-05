import type { CatalogDay, CatalogMovie, FeaturedSource } from "./types";

export function sixDayKeys(now = new Date()): string[] {
	const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
	const start = new Date(`${today}T12:00:00+05:00`);
	const days: string[] = [];
	for (let i = 0; i < 6; i++) {
		const next = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
		days.push(next.toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" }));
	}
	return days;
}

export function catalogRange(now = new Date()): { from: string; to: string } {
	const days = sixDayKeys(now);
	const from = `${days[0]}T00:00:00+05:00`;
	const end = new Date(`${days[5]}T00:00:00+05:00`);
	end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
	return { from, to: end.toISOString() };
}

/** Merge the same film across days. Sessions stay sorted by start time. */
export function allMovies(days: CatalogDay[]): CatalogMovie[] {
	const map = new Map<string, CatalogMovie>();
	for (const day of days) {
		for (const movie of day.movies) {
			const prev = map.get(movie.id);
			if (!prev) {
				map.set(movie.id, {
					...movie,
					genres: movie.genres ? [...movie.genres] : movie.genres,
					sessions: [...movie.sessions],
				});
				continue;
			}
			const seen = new Set(prev.sessions.map((session) => session.id));
			for (const session of movie.sessions) {
				if (!seen.has(session.id)) prev.sessions.push(session);
			}
			if ((!prev.genres || prev.genres.length === 0) && movie.genres?.length) {
				prev.genres = [...movie.genres];
			}
			if (movie.isFeatured) prev.isFeatured = true;
			if (prev.rating == null && movie.rating != null) prev.rating = movie.rating;
			if (!prev.featuredSource && movie.featuredSource) prev.featuredSource = movie.featuredSource;
		}
	}
	return [...map.values()].map((movie) => ({
		...movie,
		sessions: [...movie.sessions].sort(
			(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
		),
	}));
}

export function moviesOnDay(days: CatalogDay[], dateKey: string): CatalogMovie[] {
	return (days.find((day) => day.date === dateKey)?.movies ?? [])
		.map((movie) => ({
			...movie,
			sessions: movie.sessions.filter(
				(session) =>
					new Date(session.startsAt).toLocaleDateString("en-CA", {
						timeZone: "Asia/Tashkent",
					}) === dateKey,
			),
		}))
		.filter((movie) => movie.sessions.length > 0);
}

function earliest(movie: CatalogMovie): number {
	const first = movie.sessions[0]?.startsAt;
	return first ? new Date(first).getTime() : Number.POSITIVE_INFINITY;
}

function asSource(value: string | null | undefined, fallback: FeaturedSource): FeaturedSource {
	return value === "manual" || value === "nearest" ? value : fallback;
}

/**
 * Banner film: admin `isFeatured` / catalog hint first, otherwise the film
 * with the nearest session (more sessions wins a tie). Empty catalog → null.
 */
export function pickFeatured(
	movies: CatalogMovie[],
	hint?: { featuredMovieId?: string | null; featuredSource?: FeaturedSource | null },
): { movie: CatalogMovie; source: FeaturedSource } | null {
	if (movies.length === 0) return null;
	if (hint?.featuredMovieId) {
		const hinted = movies.find((movie) => movie.id === hint.featuredMovieId);
		if (hinted) {
			return {
				movie: hinted,
				source: asSource(hint.featuredSource, hinted.isFeatured ? "manual" : "nearest"),
			};
		}
	}
	const manual = movies.find((movie) => movie.isFeatured);
	if (manual) {
		return { movie: manual, source: asSource(manual.featuredSource, "manual") };
	}
	const ranked = [...movies].sort((a, b) => {
		const delta = earliest(a) - earliest(b);
		if (delta !== 0) return delta;
		return b.sessions.length - a.sessions.length;
	});
	const movie = ranked[0];
	if (!movie) return null;
	return { movie, source: "nearest" };
}

export function collectGenres(movies: Array<{ genres?: string[] | null }>): string[] {
	const seen = new Set<string>();
	for (const movie of movies) {
		for (const genre of movie.genres ?? []) {
			const label = genre.trim();
			if (label) seen.add(label);
		}
	}
	return [...seen];
}

export function hasRating(rating: number | null | undefined): rating is number {
	return typeof rating === "number" && Number.isFinite(rating) && rating > 0;
}

export function minSessionPrice(movie: {
	minPriceUzs?: number | null;
	sessions: Array<{ basePriceUzs: number }>;
}): number | null {
	if (typeof movie.minPriceUzs === "number" && Number.isFinite(movie.minPriceUzs)) {
		return movie.minPriceUzs;
	}
	if (movie.sessions.length === 0) return null;
	return Math.min(...movie.sessions.map((session) => session.basePriceUzs));
}

/** Session-level language badge. Missing or unknown values stay hidden. */
export function audioBadge(code: string | null | undefined): string | null {
	if (!code) return null;
	const key = code.trim().toLowerCase();
	if (!key) return null;
	if (key === "ru") return "RU";
	if (key === "uz") return "UZ";
	if (key === "en") return "EN";
	if (/^[a-z]{2,3}$/.test(key)) return key.toUpperCase();
	return null;
}

export function cinemaBlurb(cinema: {
	tagline?: string | null;
	description?: string | null;
}): string | null {
	const tagline = cinema.tagline?.trim();
	if (tagline) return tagline;
	const description = cinema.description?.trim();
	if (!description) return null;
	const line = description.split(/\n/)[0]?.trim() ?? "";
	if (!line) return null;
	return line.length > 90 ? `${line.slice(0, 87)}…` : line;
}
