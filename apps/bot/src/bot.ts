import { Bot, type Context } from "grammy";
import { botConfig } from "./config.js";
import {
	afishaInlineKeyboard,
	HELP_TEXT,
	replyMenuKeyboard,
	startInlineKeyboard,
	ticketsInlineKeyboard,
	WELCOME_TEXT,
} from "./menus.js";

export function createBot(token = botConfig.token()): Bot {
	const bot = new Bot(token);

	bot.command("start", async (ctx) => {
		await ctx.reply(WELCOME_TEXT, {
			parse_mode: "HTML",
			reply_markup: startInlineKeyboard(),
		});
		await ctx.reply("Меню быстрого доступа:", {
			reply_markup: replyMenuKeyboard(),
		});
	});

	bot.command("help", async (ctx) => {
		await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
	});

	bot.command("afisha", async (ctx) => {
		await replyAfisha(ctx);
	});

	bot.command("tickets", async (ctx) => {
		await replyTickets(ctx);
	});

	bot.callbackQuery("menu:afisha", async (ctx) => {
		await ctx.answerCallbackQuery();
		await replyAfisha(ctx);
	});

	bot.callbackQuery("menu:tickets", async (ctx) => {
		await ctx.answerCallbackQuery();
		await replyTickets(ctx);
	});

	bot.callbackQuery("menu:help", async (ctx) => {
		await ctx.answerCallbackQuery();
		await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
	});

	bot.hears("🎬 Афиша", async (ctx) => {
		await replyAfisha(ctx);
	});

	bot.hears("🎟 Мои билеты", async (ctx) => {
		await replyTickets(ctx);
	});

	bot.hears("ℹ️ Помощь", async (ctx) => {
		await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
	});

	bot.catch((err) => {
		console.error("Bot error:", err.error);
	});

	return bot;
}

async function replyAfisha(ctx: Context) {
	await ctx.reply("🎬 Актуальная афиша доступна в Mini App:", {
		reply_markup: afishaInlineKeyboard(),
	});
}

async function replyTickets(ctx: Context) {
	await ctx.reply("🎟 Ваши билеты открываются в Mini App:", {
		reply_markup: ticketsInlineKeyboard(),
	});
}
