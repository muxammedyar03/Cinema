import { InlineKeyboard, Keyboard } from "grammy";
import { botConfig, miniAppDeepLink } from "./config.js";

export function replyMenuKeyboard(): Keyboard {
	return new Keyboard()
		.text("🎬 Афиша")
		.text("🎟 Мои билеты")
		.row()
		.text("ℹ️ Помощь")
		.resized()
		.persistent();
}

export function startInlineKeyboard(): InlineKeyboard {
	const kb = new InlineKeyboard();
	const url = miniAppDeepLink();
	if (botConfig.miniAppUrl || botConfig.botUsername) {
		kb.url("📱 Открыть Mini App", url).row();
	}
	kb.text("🎬 Афиша", "menu:afisha")
		.text("🎟 Мои билеты", "menu:tickets")
		.row()
		.text("ℹ️ Помощь", "menu:help");
	return kb;
}

export function afishaInlineKeyboard(): InlineKeyboard {
	const kb = new InlineKeyboard();
	const url = miniAppDeepLink("afisha");
	if (botConfig.miniAppUrl || botConfig.botUsername) {
		kb.url("Открыть афишу", url);
	} else {
		kb.text("Афиша скоро", "menu:help");
	}
	return kb;
}

export function ticketsInlineKeyboard(): InlineKeyboard {
	const kb = new InlineKeyboard();
	const url = miniAppDeepLink("tickets");
	if (botConfig.miniAppUrl || botConfig.botUsername) {
		kb.url("Мои билеты", url);
	} else {
		kb.text("Билеты скоро", "menu:help");
	}
	return kb;
}

export const HELP_TEXT = [
	"ℹ️ <b>Помощь</b>",
	"",
	"• <b>Открыть Mini App</b> — каталог фильмов и покупка билетов",
	"• <b>Афиша</b> — ближайшие сеансы",
	"• <b>Мои билеты</b> — ваши активные билеты",
	"",
	"Подпишитесь на кинотеатры в Mini App, чтобы получать уведомления о новых сеансах.",
	"",
	"Команды: /start /help /afisha /tickets",
].join("\n");

export const WELCOME_TEXT = [
	"👋 Добро пожаловать в <b>Cinema</b>!",
	"",
	"Здесь можно смотреть афишу, покупать билеты и следить за любимыми кинотеатрами.",
	"",
	"Выберите действие ниже 👇",
].join("\n");
