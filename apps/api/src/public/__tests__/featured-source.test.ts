import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveFeaturedSource, sessionMinPriceUzs } from "../featured";

const at = (iso: string) => new Date(iso);

describe("featuredSource fallback", () => {
	it("returns null when there is no upcoming published session", () => {
		assert.equal(resolveFeaturedSource([]), null);
	});

	it("uses manual when a featured movie has an upcoming session, even if another film is sooner", () => {
		const pick = resolveFeaturedSource([
			{ movieId: "soon", isFeatured: false, startsAt: at("2026-09-28T12:00:00Z") },
			{ movieId: "star", isFeatured: true, startsAt: at("2026-09-28T18:00:00Z") },
		]);
		assert.deepEqual(pick, { movieId: "star", featuredSource: "manual" });
	});

	it("falls back to the nearest upcoming movie when the featured film has no upcoming session", () => {
		const pick = resolveFeaturedSource([
			{ movieId: "later", isFeatured: false, startsAt: at("2026-09-29T12:00:00Z") },
			{ movieId: "soon", isFeatured: false, startsAt: at("2026-09-28T12:00:00Z") },
		]);
		assert.deepEqual(pick, { movieId: "soon", featuredSource: "nearest" });
	});

	it("picks the soonest session among featured movies", () => {
		const pick = resolveFeaturedSource([
			{ movieId: "late-star", isFeatured: true, startsAt: at("2026-09-29T12:00:00Z") },
			{ movieId: "early-star", isFeatured: true, startsAt: at("2026-09-28T15:00:00Z") },
		]);
		assert.deepEqual(pick, { movieId: "early-star", featuredSource: "manual" });
	});
});

describe("sessionMinPriceUzs", () => {
	it("uses the discounted minimum of standard and VIP and ignores blocked seats", () => {
		assert.equal(
			sessionMinPriceUzs({
				basePriceUzs: 100_000,
				discountPercent: 10,
				pricing: [
					{ seatType: "STANDARD", priceUzs: 100_000 },
					{ seatType: "VIP", priceUzs: 80_000 },
					{ seatType: "BLOCKED", priceUzs: 1 },
				],
			}),
			72_000,
		);
	});

	it("returns null when there is no positive price", () => {
		assert.equal(sessionMinPriceUzs({ basePriceUzs: 0, discountPercent: 0, pricing: [] }), null);
	});
});
