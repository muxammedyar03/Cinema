export type TelegramWebApp = {
	initData: string;
	initDataUnsafe?: {
		user?: { id: number; username?: string; language_code?: string };
		start_param?: string;
	};
	ready: () => void;
	expand: () => void;
	openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
	openTelegramLink?: (url: string) => void;
	colorScheme?: "light" | "dark";
	MainButton?: TelegramMainButton;
};

export type TelegramMainButton = {
	text: string;
	setText: (text: string) => TelegramMainButton;
	show: () => TelegramMainButton;
	hide: () => TelegramMainButton;
	enable: () => TelegramMainButton;
	disable: () => TelegramMainButton;
	showProgress: (leaveActive?: boolean) => TelegramMainButton;
	hideProgress: () => TelegramMainButton;
	onClick: (fn: () => void) => TelegramMainButton;
	offClick: (fn: () => void) => TelegramMainButton;
};

declare global {
	interface Window {
		Telegram?: { WebApp?: TelegramWebApp };
	}
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
	if (typeof window === "undefined") return undefined;
	return window.Telegram?.WebApp;
}

export function getTelegramInitData(): string {
	return getTelegramWebApp()?.initData?.trim() ?? "";
}

export function bootTelegramWebApp(): TelegramWebApp | undefined {
	const tg = getTelegramWebApp();
	if (!tg) return undefined;
	try {
		tg.ready();
		tg.expand();
	} catch {
		/* WebView without full API */
	}
	return tg;
}

/** Wait briefly so telegram-web-app.js can attach before we read initData. */
export async function waitForTelegram(timeoutMs = 1200): Promise<TelegramWebApp | undefined> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		const tg = getTelegramWebApp();
		if (tg?.initData) {
			bootTelegramWebApp();
			return tg;
		}
		await new Promise((r) => setTimeout(r, 40));
	}
	return bootTelegramWebApp();
}

export function openExternalUrl(url: string) {
	const tg = getTelegramWebApp();
	if (tg?.openTelegramLink && (/^https?:\/\/t\.me\//i.test(url) || url.startsWith("tg:"))) {
		tg.openTelegramLink(url);
		return;
	}
	if (tg?.openLink && /^https?:\/\//i.test(url)) {
		tg.openLink(url);
		return;
	}
	if (typeof window !== "undefined") {
		window.open(url, "_blank", "noopener,noreferrer");
	}
}
