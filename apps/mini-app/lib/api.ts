const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
		cache: "no-store",
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `API ${res.status}`);
	}
	return res.json() as Promise<T>;
}

export async function clientApi<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		...init,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(text || `API ${res.status}`);
	}
	if (!text) return undefined as T;
	return JSON.parse(text) as T;
}

export async function ensureTelegramSession() {
	try {
		await clientApi("/auth/me");
		return;
	} catch {
		await clientApi("/auth/telegram", {
			method: "POST",
			body: JSON.stringify({ telegramId: "dev-telegram-user", username: "dev" }),
		});
	}
}
