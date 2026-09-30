import "server-only";
import { parseApiError } from "./api-error";

const API = process.env.API_URL ?? "http://localhost:3001";

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
		throw parseApiError(text, res.status);
	}
	return res.json() as Promise<T>;
}
