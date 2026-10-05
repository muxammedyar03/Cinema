import { type Context, InlineKeyboard, InputFile } from "grammy";
import QRCode from "qrcode";
import { botConfig } from "./config.js";
import { afishaInlineKeyboard } from "./menus.js";
export type BotTicket = {
	id: string;
	movieTitle: string;
	cinemaName: string;
	startsAt: string;
	hallName: string;
	seatLabel: string;
	status: string;
};
export function escapeHtml(text: string) {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function ticketText(ticket: BotTicket) {
	const when = new Date(ticket.startsAt).toLocaleString("ru-RU", {
		timeZone: "Asia/Tashkent",
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
	const status: Record<string, string> = {
		ACTIVE: "Действителен",
		USED: "Использован",
		REFUNDED: "Возвращён",
		CANCELLED: "Отменён",
	};
	return `<b>${escapeHtml(ticket.movieTitle)}</b>\n${escapeHtml(ticket.cinemaName)} · ${when}\n${escapeHtml(ticket.hallName)} · ${escapeHtml(ticket.seatLabel)}\n${status[ticket.status] ?? "Недействителен"}`;
}
async function get<T>(telegramId: number, path: string): Promise<T> {
	const secret = botConfig.internalSecret();
	if (!secret) throw new Error("INTERNAL_API_SECRET is unset");
	const res = await fetch(
		`${botConfig.apiUrl()}/internal/telegram-users/${telegramId}/tickets${path}`,
		{ headers: { "X-Internal-Secret": secret }, signal: AbortSignal.timeout(8000) },
	);
	if (!res.ok) throw new Error(`Tickets API ${res.status}`);
	return res.json() as Promise<T>;
}
export async function replyTickets(ctx: Context, page = 0, scope = "active") {
	if (ctx.chat?.type !== "private" || !ctx.from) {
		await ctx.reply("Билеты доступны только в личном чате с ботом.");
		return;
	}
	try {
		const data = await get<{ tickets: BotTicket[]; hasNext: boolean; total: number }>(
			ctx.from.id,
			`?page=${page}&scope=${scope}`,
		);
		if (!data.tickets.length) {
			await ctx.reply(
				scope === "active"
					? "У вас пока нет активных билетов"
					: "Старых или использованных билетов нет",
				{
					reply_markup: new InlineKeyboard().text(
						scope === "active" ? "История билетов" : "Активные билеты",
						`tickets:${scope === "active" ? "history" : "active"}:0`,
					),
				},
			);
			await ctx.reply("Выберите новый сеанс:", { reply_markup: afishaInlineKeyboard() });
			return;
		}
		for (const ticket of data.tickets)
			await ctx.reply(ticketText(ticket), {
				parse_mode: "HTML",
				reply_markup:
					scope === "active"
						? new InlineKeyboard().text("Показать QR", `ticket:qr:${ticket.id}`)
						: undefined,
			});
		const kb = new InlineKeyboard();
		if (page > 0) kb.text("Назад", `tickets:${scope}:${page - 1}`);
		if (data.hasNext) kb.text("Далее", `tickets:${scope}:${page + 1}`);
		kb.row().text(
			scope === "active" ? "Старые / использованные" : "Активные билеты",
			`tickets:${scope === "active" ? "history" : "active"}:0`,
		);
		await ctx.reply(`Страница ${page + 1} · Всего ${data.total}`, { reply_markup: kb });
	} catch {
		await ctx.reply("Не удалось загрузить билеты. Повторите /tickets через несколько секунд.");
	}
}
export async function replyTicketQr(ctx: Context, id: string) {
	if (ctx.chat?.type !== "private" || !ctx.from) return;
	try {
		const data = await get<{ code: string } | null>(ctx.from.id, `/${encodeURIComponent(id)}/qr`);
		if (!data) {
			await ctx.reply("Билет уже недействителен или не принадлежит вам.");
			return;
		}
		const image = await QRCode.toBuffer(data.code, {
			width: 420,
			margin: 4,
			errorCorrectionLevel: "M",
		});
		await ctx.replyWithPhoto(new InputFile(image, "ticket.png"), {
			caption: `Билет · ${data.code}`,
		});
	} catch {
		await ctx.reply("Не удалось показать QR. Повторите попытку позже.");
	}
}
