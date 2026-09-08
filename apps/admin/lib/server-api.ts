import type { SessionUser } from "@cinema/types";
import { cookies } from "next/headers";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function serverApi<T>(path: string, init?: RequestInit): Promise<T> {
	const jar = await cookies();
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			cookie: jar.toString(),
			...init?.headers,
		},
		cache: "no-store",
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(text || `API ${res.status}`);
	}
	if (!text) {
		return null as T;
	}
	return JSON.parse(text) as T;
}

export async function getMe(): Promise<SessionUser | null> {
	try {
		const data = await serverApi<{ user: SessionUser }>("/auth/me");
		return data.user;
	} catch {
		return null;
	}
}
