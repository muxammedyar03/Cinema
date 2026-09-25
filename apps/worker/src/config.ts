import "dotenv/config";
import { resolveDebounceMs } from "./follow-digest/follow-digest.options.js";

export const workerConfig = {
	redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
	databaseUrl: process.env.DATABASE_URL,
	botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
	/** KAN-35 per-cinema digest window (ms). */
	followNotifyDebounceMs: resolveDebounceMs(process.env.FOLLOW_NOTIFY_DEBOUNCE_MS),
};

export function redisConnectionFromUrl(url: string) {
	const parsed = new URL(url);
	return {
		host: parsed.hostname,
		port: Number(parsed.port || 6379),
		username: parsed.username || undefined,
		password: parsed.password || undefined,
		maxRetriesPerRequest: null as null,
	};
}
