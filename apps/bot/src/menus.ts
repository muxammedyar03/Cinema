import { InlineKeyboard, Keyboard } from "grammy";
import { botConfig, miniAppDeepLink, miniAppTelegramLink } from "./config.js";

export function replyMenuKeyboard(): Keyboard {
	return new Keyboard()
		.text("🎬 Афиша")
		.text("🎟 Мои билеты")
		.row()
		.text("ℹ️ Помощь")
		.resized()
		.persistent();
}

export function startInlineKeyboard(privateChat = true): InlineKeyboard {
	const kb = new InlineKeyboard();
	if (botConfig.miniAppUrl || botConfig.botUsername) {
		if (privateChat && botConfig.miniAppUrl)
			kb.webApp("📱 Открыть Mini App", botConfig.miniAppUrl).row();
		else kb.url("📱 Открыть Mini App", miniAppTelegramLink()).row();
	}
	kb.text("🎬 Афиша", "menu:afisha")
		.text("🎟 Мои билеты", "menu:tickets")
		.row()
		.text("ℹ️ Помощь", "menu:help");
	return kb;
}

export function afishaInlineKeyboard(privateChat = true): InlineKeyboard {
	const kb = new InlineKeyboard();
	const url = miniAppDeepLink("afisha");
	if (botConfig.miniAppUrl || botConfig.botUsername) {
		if (privateChat && botConfig.miniAppUrl) kb.webApp("Открыть афишу", url);
		else kb.url("Открыть афишу", miniAppTelegramLink("afisha"));
	} else {
		kb.text("Афиша скоро", "menu:help");
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
