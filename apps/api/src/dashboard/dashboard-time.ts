/** All dashboard buckets are calendar units in Asia/Tashkent (UTC+5, no DST). */

export const DASHBOARD_TZ = "Asia/Tashkent";
export const DASHBOARD_OFFSET = "+05:00";

export type ChartRange = "daily" | "weekly";

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseChartRange(raw?: string): ChartRange {
	return raw === "weekly" ? "weekly" : "daily";
}

export function dayKey(date: Date): string {
	return date.toLocaleDateString("en-CA", { timeZone: DASHBOARD_TZ });
}

export function startOfTashkentDay(date: Date): Date {
	return new Date(`${dayKey(date)}T00:00:00${DASHBOARD_OFFSET}`);
}

export function addDays(date: Date, n: number): Date {
	return new Date(date.getTime() + n * DAY_MS);
}

export function startOfToday(now = new Date()): Date {
	return startOfTashkentDay(now);
}

/** Monday 00:00 in Asia/Tashkent for the week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
	const key = dayKey(date);
	const [y, m, d] = key.split("-").map(Number);
	// Tashkent noon = 07:00 UTC the same calendar date.
	const utcDay = new Date(Date.UTC(y, m - 1, d, 7, 0, 0)).getUTCDay();
	const mondayOffset = utcDay === 0 ? 6 : utcDay - 1;
	return addDays(startOfTashkentDay(date), -mondayOffset);
}

export function bucketKey(date: Date, range: ChartRange): string {
	return range === "weekly" ? dayKey(startOfIsoWeek(date)) : dayKey(date);
}

export function rangeWindow(
	range: ChartRange,
	now = new Date(),
): { start: Date; end: Date; buckets: string[] } {
	const today = startOfToday(now);
	const end = addDays(today, 1);
	if (range === "daily") {
		const start = addDays(today, -6);
		const buckets: string[] = [];
		for (let i = 0; i < 7; i++) {
			buckets.push(dayKey(addDays(start, i)));
		}
		return { start, end, buckets };
	}
	const thisWeek = startOfIsoWeek(now);
	const start = addDays(thisWeek, -7 * 7);
	const buckets: string[] = [];
	for (let i = 0; i < 8; i++) {
		buckets.push(dayKey(addDays(start, i * 7)));
	}
	return { start, end, buckets };
}
