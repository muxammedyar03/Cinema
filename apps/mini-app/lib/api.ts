import { ApiError, parseApiError } from "./api-error";
import { getTelegramInitData, waitForTelegram } from "./telegram";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export { ApiError };

export async function clientApi<T>(path: string, init?: RequestInit): Promise<T> {
	const initData = getTelegramInitData();
	const res = await fetch(`${API}${path}`, {
		...init,
		credentials: "include",
		cache: "no-store",
		headers: {
			"Content-Type": "application/json",
			...(initData ? { "X-Telegram-Init-Data": initData } : {}),
			...init?.headers,
		},
	});
	const text = await res.text();
	if (!res.ok) {
		throw parseApiError(text, res.status);
	}
	if (!text) return undefined as T;
	return JSON.parse(text) as T;
}

let authInflight: Promise<void> | null = null;

/**
 * Mini App session: Telegram initData HMAC (header preferred).
 * Never sends client-forged telegramId. Dev stub is server-side only.
 */
export async function ensureTelegramSession(): Promise<void> {
	if (!authInflight) {
		authInflight = authenticate().finally(() => {
			authInflight = null;
		});
	}
	return authInflight;
}

async function authenticate() {
	try {
		await clientApi("/auth/me");
		return;
	} catch {
		/* need telegram auth */
	}

	await waitForTelegram();
	const initData = getTelegramInitData();
	const headers: Record<string, string> = {};
	if (initData) {
		headers["X-Telegram-Init-Data"] = initData;
	}

	await clientApi("/auth/telegram", {
		method: "POST",
		headers,
		body: JSON.stringify(initData ? {} : { initData: initData || undefined }),
	});
}
