import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addDays,
	bucketKey,
	dayKey,
	parseChartRange,
	rangeWindow,
	startOfIsoWeek,
	startOfTashkentDay,
} from "../dashboard-time";

describe("dashboard-time", () => {
	it("defaults unknown range to daily", () => {
		assert.equal(parseChartRange(undefined), "daily");
		assert.equal(parseChartRange("weekly"), "weekly");
		assert.equal(parseChartRange("nope"), "daily");
	});

	it("uses Tashkent calendar date, not UTC", () => {
		// 2026-09-11 22:30 UTC = 2026-09-12 03:30 in Tashkent
		const lateUtc = new Date("2026-09-11T22:30:00.000Z");
		assert.equal(dayKey(lateUtc), "2026-09-12");
		assert.equal(startOfTashkentDay(lateUtc).toISOString(), "2026-09-11T19:00:00.000Z");
	});

	it("starts ISO weeks on Monday in Tashkent", () => {
		const friday = new Date("2026-09-11T10:00:00+05:00");
		assert.equal(dayKey(startOfIsoWeek(friday)), "2026-09-07");
		const sunday = new Date("2026-09-13T23:00:00+05:00");
		assert.equal(dayKey(startOfIsoWeek(sunday)), "2026-09-07");
		const monday = new Date("2026-09-14T00:30:00+05:00");
		assert.equal(dayKey(startOfIsoWeek(monday)), "2026-09-14");
	});

	it("builds 7 daily buckets ending today", () => {
		const now = new Date("2026-09-11T15:00:00+05:00");
		const { start, end, buckets } = rangeWindow("daily", now);
		assert.equal(buckets.length, 7);
		assert.equal(buckets[0], "2026-09-05");
		assert.equal(buckets[6], "2026-09-11");
		assert.equal(dayKey(start), "2026-09-05");
		assert.equal(dayKey(end), "2026-09-12");
	});

	it("builds 8 weekly buckets Monday-aligned", () => {
		const now = new Date("2026-09-11T15:00:00+05:00");
		const { start, buckets } = rangeWindow("weekly", now);
		assert.equal(buckets.length, 8);
		assert.equal(buckets[7], "2026-09-07");
		assert.equal(dayKey(start), buckets[0]);
		assert.equal(addDays(start, 7 * 7).getTime(), startOfIsoWeek(now).getTime());
	});

	it("bucketKey follows the selected granularity", () => {
		const d = new Date("2026-09-11T08:00:00+05:00");
		assert.equal(bucketKey(d, "daily"), "2026-09-11");
		assert.equal(bucketKey(d, "weekly"), "2026-09-07");
	});
});
