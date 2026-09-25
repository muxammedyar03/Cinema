/**
 * Pure formatter for the per-cinema follow digest (KAN-35).
 * Output is Telegram `parse_mode: "HTML"` — all user text is escaped.
 */

/** Same zone as the existing KAN-26 per-session copy. */
export const DIGEST_TIME_ZONE = "Asia/Tashkent";
export const DIGEST_MAX_FILMS = 5;
export const DIGEST_HEADER = "Новые сеансы";
export const DIGEST_BUTTON_TEXT = "Открыть афишу";

export type DigestSessionInput = {
	movieId: string;
	movieTitle: string;
	startsAt: Date;
};

export type FormatAfishaDigestInput = {
	cinemaName: string;
	sessions: DigestSessionInput[];
	/** Reference "now" — date labels are omitted only when every session is today. */
	now: Date;
	timeZone?: string;
	maxFilms?: number;
};

type FilmGroup = {
	movieId: string;
	title: string;
	first: number;
	starts: Date[];
};

export function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Russian plural: 1 фильм, 2 фильма, 5 фильмов, 21 фильм. */
export function pluralFilmsRu(n: number): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return "фильм";
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "фильма";
	return "фильмов";
}

export function formatAfishaDigestRu(input: FormatAfishaDigestInput): string {
	const timeZone = input.timeZone ?? DIGEST_TIME_ZONE;
	const maxFilms = input.maxFilms ?? DIGEST_MAX_FILMS;
	const header = `<b>${escapeHtml(input.cinemaName.trim())}</b> — ${DIGEST_HEADER}`;

	const films = groupByFilm(input.sessions);
	if (films.length === 0) return header;

	const today = localDateKey(input.now, timeZone);
	const allToday = input.sessions.every((s) => localDateKey(s.startsAt, timeZone) === today);

	const lines = [header];
	for (const film of films.slice(0, maxFilms)) {
		lines.push(
			`${escapeHtml(film.title.trim())} — ${formatFilmTimes(film.starts, timeZone, !allToday)}`,
		);
	}
	const hidden = films.length - maxFilms;
	if (hidden > 0) {
		lines.push(`и ещё ${hidden} ${pluralFilmsRu(hidden)}`);
	}
	return lines.join("\n");
}

function groupByFilm(sessions: DigestSessionInput[]): FilmGroup[] {
	const byMovie = new Map<string, FilmGroup>();
	for (const s of sessions) {
		const ts = s.startsAt.getTime();
		const group = byMovie.get(s.movieId);
		if (group) {
			group.starts.push(s.startsAt);
			group.first = Math.min(group.first, ts);
		} else {
			byMovie.set(s.movieId, {
				movieId: s.movieId,
				title: s.movieTitle,
				first: ts,
				starts: [s.startsAt],
			});
		}
	}
	const films = [...byMovie.values()];
	for (const f of films) f.starts.sort((a, b) => a.getTime() - b.getTime());
	films.sort((a, b) => a.first - b.first || a.title.localeCompare(b.title, "ru"));
	return films;
}

/**
 * `14:00, 17:30` when no dates are needed, otherwise
 * `26 сент.: 14:00, 17:30; 27 сент.: 21:00` (dates in chronological order).
 */
function formatFilmTimes(starts: Date[], timeZone: string, withDates: boolean): string {
	const days: Array<{ key: string; label: string; times: string[] }> = [];
	for (const d of starts) {
		const key = localDateKey(d, timeZone);
		let day = days[days.length - 1];
		if (!day || day.key !== key) {
			day = { key, label: formatDayLabel(d, timeZone), times: [] };
			days.push(day);
		}
		const time = formatTime(d, timeZone);
		if (!day.times.includes(time)) day.times.push(time);
	}
	if (!withDates) return days.flatMap((d) => d.times).join(", ");
	return days.map((d) => `${d.label}: ${d.times.join(", ")}`).join("; ");
}

function localDateKey(d: Date, timeZone: string): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(d);
}

function formatDayLabel(d: Date, timeZone: string): string {
	return d.toLocaleString("ru-RU", { timeZone, day: "numeric", month: "short" });
}

function formatTime(d: Date, timeZone: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(d);
}
