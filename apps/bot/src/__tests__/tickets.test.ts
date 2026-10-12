import assert from "node:assert/strict";
import { test } from "node:test";
import { botConfig } from "../config.js";
import { afishaInlineKeyboard, startInlineKeyboard } from "../menus.js";
import { escapeHtml, ticketText } from "../tickets.js";

test("private-chat buttons use web_app while groups use Telegram Mini App links", () => {
	botConfig.miniAppUrl = "https://mini.example.com";
	botConfig.botUsername = "cinema_bot";
	assert.deepEqual(afishaInlineKeyboard().inline_keyboard[0][0], {
		text: "Открыть афишу",
		web_app: { url: "https://mini.example.com?startapp=afisha" },
	});
	const group = afishaInlineKeyboard(false).inline_keyboard[0][0];
	assert.ok("url" in group && group.url.startsWith("https://t.me/cinema_bot/"));
	assert.ok("web_app" in startInlineKeyboard().inline_keyboard[0][0]);
});
test("movie and seat text cannot inject Telegram HTML", () => {
	assert.equal(escapeHtml("<b>&"), "&lt;b&gt;&amp;");
	const text = ticketText({
		id: "t",
		movieTitle: "<test>",
		cinemaName: "Кино",
		startsAt: "2026-10-05T12:00:00Z",
		hallName: "Зал 1",
		seatLabel: "B2",
		status: "USED",
	});
	assert.ok(text.includes("&lt;test&gt;"));
	assert.ok(text.includes("Использован"));
	assert.ok(text.includes("17:00"));
});
