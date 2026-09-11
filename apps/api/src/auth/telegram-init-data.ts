import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
	id: number;
	username?: string;
	first_name?: string;
	last_name?: string;
	language_code?: string;
	photo_url?: string;
};

export type TelegramInitDataErrorCode =
	| "INIT_DATA_REQUIRED"
	| "INIT_DATA_INVALID"
	| "INIT_DATA_EXPIRED"
	| "USER_MISSING";

export class TelegramInitDataError extends Error {
	constructor(readonly code: TelegramInitDataErrorCode) {
		super(code);
		this.name = "TelegramInitDataError";
	}
}

const DEFAULT_MAX_AGE_SEC = 86_400;

/**
 * Verify Telegram Mini App `initData` per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(
	initData: string,
	botToken: string,
	maxAgeSec = DEFAULT_MAX_AGE_SEC,
	nowSec = Math.floor(Date.now() / 1000),
): TelegramWebAppUser {
	if (!initData.trim()) {
		throw new TelegramInitDataError("INIT_DATA_REQUIRED");
	}

	const params = new URLSearchParams(initData);
	const hash = params.get("hash");
	if (!hash) {
		throw new TelegramInitDataError("INIT_DATA_INVALID");
	}
	params.delete("hash");
	params.delete("signature");

	const dataCheckString = [...params.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");

	const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
	const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

	const computedBuf = Buffer.from(computed, "hex");
	const hashBuf = Buffer.from(hash, "hex");
	if (computedBuf.length !== hashBuf.length || !timingSafeEqual(computedBuf, hashBuf)) {
		throw new TelegramInitDataError("INIT_DATA_INVALID");
	}

	const authDate = Number(params.get("auth_date"));
	if (!Number.isFinite(authDate)) {
		throw new TelegramInitDataError("INIT_DATA_INVALID");
	}
	if (authDate - nowSec > 60) {
		throw new TelegramInitDataError("INIT_DATA_INVALID");
	}
	if (nowSec - authDate > maxAgeSec) {
		throw new TelegramInitDataError("INIT_DATA_EXPIRED");
	}

	let user: TelegramWebAppUser | null = null;
	try {
		user = JSON.parse(params.get("user") ?? "null") as TelegramWebAppUser | null;
	} catch {
		throw new TelegramInitDataError("USER_MISSING");
	}
	if (!user?.id) {
		throw new TelegramInitDataError("USER_MISSING");
	}
	return user;
}

/** Build signed initData for unit tests (not for production clients). */
export function signTelegramInitData(fields: Record<string, string>, botToken: string): string {
	const params = new URLSearchParams(fields);
	const dataCheckString = [...params.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");
	const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
	const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
	params.set("hash", hash);
	return params.toString();
}
