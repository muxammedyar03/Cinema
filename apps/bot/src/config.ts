import "dotenv/config";

function required(name: string, fallback?: string): string {
	const value = process.env[name] ?? fallback;
	if (!value) {
		throw new Error(`Missing required env: ${name}`);
	}
	return value;
}

function publicMiniAppUrl(): string {
	const raw = (process.env.TELEGRAM_MINI_APP_URL ?? process.env.MINI_APP_URL ?? "").trim();
	if (!raw) return "";
	// Telegram inline keyboard URL buttons require https:// — localhost/http is rejected.
	if (!/^https:\/\//i.test(raw)) {
		console.warn(
			`Ignoring TELEGRAM_MINI_APP_URL="${raw}" (Telegram needs https://). Falling back to t.me deep-link.`,
		);
		return "";
	}
	return raw;
}

export const botConfig = {
	token: () => required("TELEGRAM_BOT_TOKEN"),
	mode: (process.env.BOT_MODE ?? "polling") as "polling" | "webhook",
	port: Number(process.env.BOT_PORT ?? 3003),
	webhookPath: process.env.BOT_WEBHOOK_PATH ?? "/telegram/webhook",
	webhookSecret: process.env.BOT_WEBHOOK_SECRET,
	webhookUrl: process.env.BOT_WEBHOOK_URL,
	miniAppUrl: publicMiniAppUrl(),
	botUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
	miniAppShortName: process.env.TELEGRAM_MINI_APP_SHORT_NAME ?? "app",
	/** Cinema API base URL. Inside Docker this is http://api:3001. */
	apiUrl: () => (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, ""),
	internalSecret: () => process.env.INTERNAL_API_SECRET?.trim() ?? "",
	/** BotFather → Payments → Click TEST. Empty hides Click in the Mini App (API reads the same var). */
	paymentProviderToken: () => process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN?.trim() ?? "",
};

export function miniAppDeepLink(startParam?: string): string {
	const base = botConfig.miniAppUrl;
	if (base) {
		if (!startParam) return base;
		const sep = base.includes("?") ? "&" : "?";
		return `${base}${sep}startapp=${encodeURIComponent(startParam)}`;
	}
	const username = botConfig.botUsername.replace(/^@/, "");
	if (!username) return "https://t.me";
	const short = botConfig.miniAppShortName;
	return startParam
		? `https://t.me/${username}/${short}?startapp=${encodeURIComponent(startParam)}`
		: `https://t.me/${username}/${short}`;
}

/** Group/channel buttons need a Telegram Mini App link, not the hosted web URL. */
export function miniAppTelegramLink(startParam?: string): string {
	const username = botConfig.botUsername.replace(/^@/, "");
	if (!username) return "https://t.me";
	const base = `https://t.me/${username}/${botConfig.miniAppShortName}`;
	return startParam ? `${base}?startapp=${encodeURIComponent(startParam)}` : base;
}
