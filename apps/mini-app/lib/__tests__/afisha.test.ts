import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	audioBadge,
	cinemaBlurb,
	collectGenres,
	hasRating,
	minSessionPrice,
	pickFeatured,
	sixDayKeys,
} from "../afisha";
import type { CatalogMovie } from "../types";

function session(id: string, startsAt: string): CatalogMovie["sessions"][number] {
	return {
		id,
		startsAt,
		cinemaId: "c",
		cinemaName: "Magic Cinema",
		hallName: "Зал 01",
		basePriceUzs: 75000,
		capacity: 48,
		remaining: 32,
	};
}

function movie(partial: Partial<CatalogMovie> & Pick<CatalogMovie, "id">): CatalogMovie {
	return {
		title: partial.id,
		posterUrl: null,
		durationMin: 100,
		ageRating: null,
		sessions: [],
		...partial,
	};
}

describe("pickFeatured", () => {
	it("uses the admin featured film", () => {
		const films = [
			movie({
				id: "early",
				sessions: [session("s1", "2026-09-28T09:00:00+05:00")],
			}),
			movie({
				id: "featured",
				isFeatured: true,
				featuredSource: "manual",
				sessions: [session("s2", "2026-09-28T20:00:00+05:00")],
			}),
		];
		const picked = pickFeatured(films);
		assert.equal(picked?.movie.id, "featured");
		assert.equal(picked?.source, "manual");
	});

	it("falls back to the nearest session when nothing is featured", () => {
		const films = [
			movie({
				id: "later",
				sessions: [
					session("a", "2026-09-29T12:00:00+05:00"),
					session("b", "2026-09-29T18:00:00+05:00"),
				],
			}),
			movie({
				id: "soon",
				sessions: [session("c", "2026-09-28T15:00:00+05:00")],
			}),
		];
		const picked = pickFeatured(films);
		assert.equal(picked?.movie.id, "soon");
		assert.equal(picked?.source, "nearest");
	});

	it("prefers a catalog hint and reports its source", () => {
		const films = [movie({ id: "a", isFeatured: true }), movie({ id: "b" })];
		const picked = pickFeatured(films, { featuredMovieId: "b", featuredSource: "nearest" });
		assert.equal(picked?.movie.id, "b");
		assert.equal(picked?.source, "nearest");
	});

	it("returns null when the afisha is empty", () => {
		assert.equal(pickFeatured([]), null);
	});
});

describe("collectGenres and rating", () => {
	it("hides the genre row when every film has an empty list", () => {
		assert.deepEqual(
			collectGenres([{ genres: [] }, { genres: undefined }, { genres: ["  "] }]),
			[],
		);
	});

	it("keeps real genres only", () => {
		assert.deepEqual(collectGenres([{ genres: ["Фантастика", ""] }, { genres: ["Детектив"] }]), [
			"Фантастика",
			"Детектив",
		]);
	});

	it("treats missing and zero ratings as empty", () => {
		assert.equal(hasRating(null), false);
		assert.equal(hasRating(undefined), false);
		assert.equal(hasRating(0), false);
		assert.equal(hasRating(8.5), true);
	});
});

describe("audioBadge", () => {
	it("maps session languages and hides empty values", () => {
		assert.equal(audioBadge("ru"), "RU");
		assert.equal(audioBadge("UZ"), "UZ");
		assert.equal(audioBadge("en"), "EN");
		assert.equal(audioBadge(null), null);
		assert.equal(audioBadge(""), null);
		assert.equal(audioBadge("russian"), null);
	});
});

describe("prices, blurbs, and the six-day strip", () => {
	it("uses minPriceUzs when the API sends it", () => {
		assert.equal(
			minSessionPrice({ minPriceUzs: 50000, sessions: [{ basePriceUzs: 90000 }] }),
			50000,
		);
		assert.equal(
			minSessionPrice({ sessions: [{ basePriceUzs: 80000 }, { basePriceUzs: 60000 }] }),
			60000,
		);
		assert.equal(minSessionPrice({ sessions: [] }), null);
	});

	it("does not invent a cinema blurb", () => {
		assert.equal(cinemaBlurb({}), null);
		assert.equal(cinemaBlurb({ tagline: "  В парке  " }), "В парке");
		assert.equal(cinemaBlurb({ description: "Первая строка\nвторая" }), "Первая строка");
	});

	it("builds six Tashkent dates", () => {
		const days = sixDayKeys(new Date("2026-09-28T10:00:00+05:00"));
		assert.deepEqual(days, [
			"2026-09-28",
			"2026-09-29",
			"2026-09-30",
			"2026-10-01",
			"2026-10-02",
			"2026-10-03",
		]);
	});
});
