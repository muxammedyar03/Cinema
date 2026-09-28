const TZ = "Asia/Tashkent";
const LOCALE = "ru-RU";

export function formatPrice(uzs: number): string {
	return `${uzs.toLocaleString(LOCALE)} сум`;
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(LOCALE, {
		timeZone: TZ,
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function filmsCountLabel(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return `${count} фильм`;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} фильма`;
	return `${count} фильмов`;
}

export function weekdayShort(dateKey: string): string {
	return new Date(`${dateKey}T12:00:00+05:00`)
		.toLocaleDateString(LOCALE, { timeZone: TZ, weekday: "short" })
		.replace(".", "");
}

export function dayNumber(dateKey: string): string {
	return new Date(`${dateKey}T12:00:00+05:00`).toLocaleDateString(LOCALE, {
		timeZone: TZ,
		day: "numeric",
	});
}

export function formatMonthDay(dateKey: string): string {
	return new Date(`${dateKey}T12:00:00+05:00`).toLocaleDateString(LOCALE, {
		timeZone: TZ,
		day: "numeric",
		month: "long",
	});
}

export function formatSessionDate(iso: string): string {
	return new Date(iso).toLocaleDateString(LOCALE, {
		timeZone: TZ,
		day: "numeric",
		month: "long",
	});
}

export function formatMinutes(min: number): string {
	return `${min} мин`;
}

export function formatDayLabel(dateKey: string): string {
	const d = new Date(`${dateKey}T12:00:00+05:00`);
	return d.toLocaleDateString(LOCALE, {
		timeZone: TZ,
		weekday: "short",
		day: "numeric",
		month: "short",
	});
}

export function formatCountdown(ms: number): string {
	if (ms <= 0) return "00:00";
	const total = Math.floor(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h <= 0) return `${m} мин`;
	return m ? `${h} ч ${m} мин` : `${h} ч`;
}
