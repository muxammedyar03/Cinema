"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function errorMessage(text: string, status: number) {
	try {
		const body = JSON.parse(text) as { message?: string | string[] };
		if (Array.isArray(body.message)) return body.message.join(", ");
		if (typeof body.message === "string") return body.message;
	} catch {
		/* plain text */
	}
	return text || `API ${status}`;
}

export async function clientApi<T>(path: string, init?: RequestInit): Promise<T> {
	const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
	const res = await fetch(`${API}${path}`, {
		...init,
		credentials: "include",
		headers: {
			...(isForm ? {} : { "Content-Type": "application/json" }),
			...init?.headers,
		},
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(errorMessage(text, res.status));
	}
	if (res.status === 204 || !text) {
		return undefined as T;
	}
	return JSON.parse(text) as T;
}
