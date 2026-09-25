/**
 * Telegram Mini App launch parameter (`startapp` / `start_param`).
 * Pure parsing only — navigation lives in `telegram-boot.tsx`.
 */

export type DeepLinkTarget =
	| { kind: "afisha"; href: "/" }
	| { kind: "tickets"; href: "/orders" }
	| { kind: "cinema"; id: string; href: `/cinemas/${string}` }
	| { kind: "session"; id: string; href: `/sessions/${string}` };

/** Values the caller already has, plus the raw URL search/hash to read them from. */
export type StartParamSources = {
	/** `Telegram.WebApp.initDataUnsafe.start_param` */
	initDataStartParam?: string | null;
	/** Decoded `startapp` value, if already extracted. */
	startapp?: string | null;
	/** Decoded `tgWebAppStartParam` value, if already extracted. */
	tgWebAppStartParam?: string | null;
	/** Page query string (`?startapp=` when `TELEGRAM_MINI_APP_URL` is a plain https link). */
	search?: string | null;
	/** URL hash. The Telegram client puts `tgWebAppStartParam` here. */
	hash?: string | null;
};

/** Telegram allows A–Z, a–z, 0–9, `_`, `-`, and at most 64 characters. */
const START_PARAM = /^[A-Za-z0-9_-]{1,64}$/;
/** Non-empty id that is safe to drop into an existing `/cinemas|sessions/:id` path. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function nonempty(value: string | null | undefined): string | null {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function paramsOf(raw: string | null | undefined): URLSearchParams {
	if (!raw) return new URLSearchParams();
	const query = raw.trim().replace(/^[?#]/, "");
	if (!query) return new URLSearchParams();
	return new URLSearchParams(query);
}

/**
 * Pick the raw launch parameter.
 * Order: initData `start_param`, then `startapp`, then `tgWebAppStartParam`.
 * A non-empty earlier source wins even if it later fails to parse.
 */
export function pickStartParam(sources: StartParamSources): string | null {
	const search = paramsOf(sources.search);
	const hash = paramsOf(sources.hash);
	const startapp =
		nonempty(sources.startapp) ??
		nonempty(search.get("startapp")) ??
		nonempty(hash.get("startapp"));
	const launchParam =
		nonempty(sources.tgWebAppStartParam) ??
		nonempty(search.get("tgWebAppStartParam")) ??
		nonempty(hash.get("tgWebAppStartParam"));
	return nonempty(sources.initDataStartParam) ?? startapp ?? launchParam;
}

function safeId(value: string, prefix: "cinema_" | "session_"): string | null {
	if (!value.startsWith(prefix)) return null;
	const id = value.slice(prefix.length);
	return ID.test(id) ? id : null;
}

/** Map one launch parameter to an existing route. Unknown or malformed → null (home, no error). */
export function parseStartParam(raw: string | null | undefined): DeepLinkTarget | null {
	const value = nonempty(raw);
	if (!value || !START_PARAM.test(value)) return null;
	if (value === "afisha") return { kind: "afisha", href: "/" };
	if (value === "tickets") return { kind: "tickets", href: "/orders" };

	if (value.startsWith("cinema_")) {
		const id = safeId(value, "cinema_");
		return id ? { kind: "cinema", id, href: `/cinemas/${id}` } : null;
	}
	if (value.startsWith("session_")) {
		const id = safeId(value, "session_");
		return id ? { kind: "session", id, href: `/sessions/${id}` } : null;
	}
	return null;
}

/** Resolve both launch sources to a route target. */
export function resolveDeepLink(sources: StartParamSources): DeepLinkTarget | null {
	return parseStartParam(pickStartParam(sources));
}
