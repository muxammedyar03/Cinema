import type { ApiResult, LoadState } from "./types";

const NETWORK = "Не удалось связаться с сервером";
const FORBIDDEN = "Нет доступа";

/** New KAN-37 routes: missing route or unexpected shape stays empty. No stand-in numbers. */
export function classifyNewEndpoint<T>(
	result: ApiResult,
	parse: (body: unknown) => T | null,
	errorMessage: string,
): LoadState<T> {
	if (result.status === 0) return { status: "error", message: NETWORK };
	if (result.status === 404 || result.status === 501) return { status: "unavailable" };
	if (result.status === 401 || result.status === 403)
		return { status: "error", message: FORBIDDEN };
	if (result.status < 200 || result.status >= 300)
		return { status: "error", message: errorMessage };
	const data = parse(result.body);
	if (data === null) return { status: "unavailable" };
	return { status: "ready", data };
}

/** Routes that already exist. A bad payload is an error, not an empty placeholder. */
export function classifyExistingEndpoint<T>(
	result: ApiResult,
	parse: (body: unknown) => T | null,
	errorMessage: string,
): LoadState<T> {
	if (result.status === 0) return { status: "error", message: NETWORK };
	if (result.status === 401 || result.status === 403)
		return { status: "error", message: FORBIDDEN };
	if (result.status < 200 || result.status >= 300)
		return { status: "error", message: errorMessage };
	const data = parse(result.body);
	if (data === null) return { status: "error", message: errorMessage };
	return { status: "ready", data };
}
