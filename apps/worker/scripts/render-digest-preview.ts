/**
 * KAN-35: renders the REAL digest formatter output (sample data) into a Telegram-style
 * HTML bubble for the PR preview image. Not a live Telegram screenshot.
 *
 *   pnpm --filter @cinema/worker exec tsx scripts/render-digest-preview.ts > /tmp/digest.html
 *   google-chrome --headless --screenshot=docs/screenshots/KAN-35-preview.png \
 *     --window-size=520,340 file:///tmp/digest.html
 */
import {
	DIGEST_BUTTON_TEXT,
	type DigestSessionInput,
	formatAfishaDigestRu,
} from "../src/follow-digest/format-afisha-digest.js";

const DAY = "2026-09-26";
const NOW = new Date(`${DAY}T09:00:00+05:00`);
const sample: Array<[string, string[]]> = [
	["Дюна 2", ["21:00", "14:00", "17:30"]],
	["Бэтмен", ["12:00", "19:45"]],
	["Оппенгеймер", ["15:10"]],
	["Интерстеллар", ["16:00", "22:30"]],
	["Мастер и Маргарита", ["18:20"]],
	["Головоломка 2", ["10:00", "13:00"]],
	["Тор & Локи <IMAX>", ["11:30", "23:15"]],
];
const sessions: DigestSessionInput[] = sample.flatMap(([title, times], i) =>
	times.map((t) => ({
		movieId: `mov_${i}`,
		movieTitle: title,
		startsAt: new Date(`${DAY}T${t}:00+05:00`),
	})),
);

const text = formatAfishaDigestRu({ cinemaName: "Navoiy Cinema", sessions, now: NOW });
const bubble = text.replace(/\n/g, "<br>");

process.stdout.write(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><style>
body{margin:0;font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
background:#0e1621;color:#fff;width:520px}
.label{background:#f5c542;color:#1b1b1b;font-size:12px;font-weight:600;padding:8px 14px;text-align:center}
.header{display:flex;align-items:center;gap:10px;background:#17212b;padding:10px 14px;border-bottom:1px solid #0b121a}
.avatar{width:36px;height:36px;border-radius:50%;background:#e8505b;display:flex;align-items:center;
justify-content:center;font-weight:700}
.name{font-weight:600;font-size:15px}.sub{font-size:12px;color:#6d7f8f}
.chat{padding:18px 14px 22px;background:#0e1621}
.msg{max-width:400px}
.bubble{background:#182533;border-radius:12px 12px 12px 4px;padding:9px 12px 20px;font-size:15px;
line-height:1.45;position:relative}
.time{position:absolute;right:10px;bottom:4px;font-size:11px;color:#6d7f8f}
.btn{margin-top:4px;background:rgba(40,56,72,.85);border-radius:8px;text-align:center;padding:9px;
font-size:14px;font-weight:500}
.btn::after{content:" ↗";font-size:11px;color:#8fa3b5}
</style></head><body>
<div class="label">Preview render of formatter output (sample data), not a live Telegram screenshot</div>
<div class="header"><div class="avatar">C</div><div><div class="name">Cinema Bot</div>
<div class="sub">bot</div></div></div>
<div class="chat"><div class="msg">
<div class="bubble">${bubble}<span class="time">09:05</span></div>
<div class="btn">${DIGEST_BUTTON_TEXT}</div>
</div></div>
</body></html>
`);
