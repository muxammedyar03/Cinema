import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type DigestSessionInput,
	escapeHtml,
	formatAfishaDigestRu,
	pluralFilmsRu,
} from "../format-afisha-digest.js";

// Asia/Tashkent = UTC+5. 09:00Z → 14:00 local.
const NOW = new Date("2026-09-26T04:00:00.000Z"); // 26 Sep, 09:00 local

function at(localDate: string, localTime: string): Date {
	return new Date(`${localDate}T${localTime}:00+05:00`);
}

function s(movieId: string, movieTitle: string, startsAt: Date): DigestSessionInput {
	return { movieId, movieTitle, startsAt };
}

describe("formatAfishaDigestRu", () => {
	it("renders header + one line per film with sorted times (<= 5 films, same day)", () => {
		const text = formatAfishaDigestRu({
			cinemaName: "Navoiy Cinema",
			now: NOW,
			sessions: [
				s("m1", "Дюна 2", at("2026-09-26", "21:00")),
				s("m2", "Бэтмен", at("2026-09-26", "12:00")),
				s("m1", "Дюна 2", at("2026-09-26", "14:00")),
				s("m1", "Дюна 2", at("2026-09-26", "17:30")),
			],
		});
		assert.equal(
			text,
			[
				"<b>Navoiy Cinema</b> — Новые сеансы",
				"Бэтмен — 12:00",
				"Дюна 2 — 14:00, 17:30, 21:00",
			].join("\n"),
		);
	});

	it("shows first 5 films then «и ещё N фильмов»", () => {
		const titles = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"];
		const sessions = titles.map((t, i) =>
			s(`m${i}`, t, at("2026-09-26", `${String(10 + i).padStart(2, "0")}:00`)),
		);
		const lines = formatAfishaDigestRu({ cinemaName: "C", now: NOW, sessions }).split("\n");
		assert.equal(lines.length, 1 + 5 + 1);
		assert.deepEqual(lines.slice(1, 6), [
			"A1 — 10:00",
			"A2 — 11:00",
			"A3 — 12:00",
			"A4 — 13:00",
			"A5 — 14:00",
		]);
		assert.equal(lines[6], "и ещё 5 фильмов");
	});

	it("uses correct plural for the overflow line (7 films → 2 фильма)", () => {
		const sessions = Array.from({ length: 7 }, (_, i) =>
			s(`m${i}`, `F${i}`, at("2026-09-26", `1${i}:00`)),
		);
		const text = formatAfishaDigestRu({ cinemaName: "C", now: NOW, sessions });
		assert.ok(text.endsWith("\nи ещё 2 фильма"));
		const six = formatAfishaDigestRu({ cinemaName: "C", now: NOW, sessions: sessions.slice(0, 6) });
		assert.ok(six.endsWith("\nи ещё 1 фильм"));
		const five = formatAfishaDigestRu({
			cinemaName: "C",
			now: NOW,
			sessions: sessions.slice(0, 5),
		});
		assert.ok(!five.includes("и ещё"));
	});

	it("orders films by their earliest session and sorts times inside a film", () => {
		const text = formatAfishaDigestRu({
			cinemaName: "C",
			now: NOW,
			sessions: [
				s("late", "Поздний", at("2026-09-26", "23:00")),
				s("early", "Ранний", at("2026-09-26", "20:15")),
				s("early", "Ранний", at("2026-09-26", "09:05")),
				s("early", "Ранний", at("2026-09-26", "09:05")),
			],
		});
		assert.deepEqual(text.split("\n").slice(1), ["Ранний — 09:05, 20:15", "Поздний — 23:00"]);
	});

	it("adds compact dates when sessions are not all today", () => {
		const text = formatAfishaDigestRu({
			cinemaName: "C",
			now: NOW,
			sessions: [
				s("m1", "Дюна 2", at("2026-09-27", "21:00")),
				s("m1", "Дюна 2", at("2026-09-26", "17:30")),
				s("m1", "Дюна 2", at("2026-09-26", "14:00")),
			],
		});
		assert.equal(text.split("\n")[1], "Дюна 2 — 26 сент.: 14:00, 17:30; 27 сент.: 21:00");

		const tomorrowOnly = formatAfishaDigestRu({
			cinemaName: "C",
			now: NOW,
			sessions: [s("m1", "Дюна 2", at("2026-09-27", "10:00"))],
		});
		assert.equal(tomorrowOnly.split("\n")[1], "Дюна 2 — 27 сент.: 10:00");
	});

	it("uses Asia/Tashkent local time (UTC day boundary)", () => {
		// 2026-09-26T20:30Z = 27 Sep 01:30 local
		const text = formatAfishaDigestRu({
			cinemaName: "C",
			now: new Date("2026-09-26T20:00:00.000Z"),
			sessions: [s("m1", "Ночной", new Date("2026-09-26T20:30:00.000Z"))],
		});
		assert.equal(text.split("\n")[1], "Ночной — 01:30");
	});

	it("escapes HTML in cinema name and film titles", () => {
		const text = formatAfishaDigestRu({
			cinemaName: "Kino <Plaza> & Co",
			now: NOW,
			sessions: [s("m1", "<b>Tom & Jerry</b>", at("2026-09-26", "10:00"))],
		});
		assert.equal(
			text,
			"<b>Kino &lt;Plaza&gt; &amp; Co</b> — Новые сеансы\n&lt;b&gt;Tom &amp; Jerry&lt;/b&gt; — 10:00",
		);
		assert.equal(escapeHtml("a<b>&"), "a&lt;b&gt;&amp;");
	});

	it("pluralizes фильм correctly", () => {
		assert.equal(pluralFilmsRu(1), "фильм");
		assert.equal(pluralFilmsRu(3), "фильма");
		assert.equal(pluralFilmsRu(5), "фильмов");
		assert.equal(pluralFilmsRu(11), "фильмов");
		assert.equal(pluralFilmsRu(21), "фильм");
		assert.equal(pluralFilmsRu(22), "фильма");
		assert.equal(pluralFilmsRu(14), "фильмов");
	});
});
