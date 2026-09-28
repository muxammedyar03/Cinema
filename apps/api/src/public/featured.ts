export type FeaturedCandidate = {
	movieId: string;
	isFeatured: boolean;
	startsAt: Date;
};

/**
 * Candidates are upcoming PUBLISHED sessions only.
 * manual — an isFeatured movie is in the set.
 * nearest — no featured movie has an upcoming session; pick the soonest one.
 * null — nothing upcoming, so the client hides the card.
 */
export function resolveFeaturedSource(
	candidates: FeaturedCandidate[],
): { movieId: string; featuredSource: "manual" | "nearest" } | null {
	if (candidates.length === 0) return null;

	const byMovie = new Map<string, { isFeatured: boolean; startsAt: Date }>();
	for (const candidate of candidates) {
		const prev = byMovie.get(candidate.movieId);
		if (!prev || candidate.startsAt < prev.startsAt) {
			byMovie.set(candidate.movieId, {
				isFeatured: candidate.isFeatured || (prev?.isFeatured ?? false),
				startsAt: candidate.startsAt,
			});
		} else if (candidate.isFeatured) {
			prev.isFeatured = true;
		}
	}

	const rows = [...byMovie.entries()];
	const featured = rows.filter(([, row]) => row.isFeatured);
	const pool = featured.length > 0 ? featured : rows;
	pool.sort(
		(a, b) => a[1].startsAt.getTime() - b[1].startsAt.getTime() || a[0].localeCompare(b[0]),
	);
	const winner = pool[0];
	if (!winner) return null;
	return {
		movieId: winner[0],
		featuredSource: featured.length > 0 ? "manual" : "nearest",
	};
}

/** Lowest positive seat price after discount. Null when no positive price exists. */
export function sessionMinPriceUzs(input: {
	basePriceUzs: number;
	discountPercent: number;
	pricing?: Array<{ seatType: string; priceUzs: number }>;
}): number | null {
	const prices: number[] = [];
	if (input.basePriceUzs > 0) prices.push(input.basePriceUzs);
	for (const row of input.pricing ?? []) {
		if (row.seatType === "BLOCKED") continue;
		if (row.priceUzs > 0) prices.push(row.priceUzs);
	}
	if (prices.length === 0) return null;
	const factor = (100 - input.discountPercent) / 100;
	return Math.min(...prices.map((price) => Math.round(price * factor)));
}
