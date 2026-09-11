"use client";

import { ApiError, parseApiError } from "./api-error";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export { ApiError };

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
		throw parseApiError(text, res.status);
	}
	if (res.status === 204 || !text) {
		return undefined as T;
	}
	return JSON.parse(text) as T;
}
