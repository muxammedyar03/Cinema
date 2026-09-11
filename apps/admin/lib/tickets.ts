export function normalizeTicketCode(code: string): string {
	return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function displayTicketCode(code: string): string {
	const raw = normalizeTicketCode(code);
	return (raw.match(/.{1,4}/g) ?? [raw]).join("-");
}

/** Accepts admin verify URL (`?c=`) or raw / dashed code. */
export function parseScannedCode(input: string): string {
	const trimmed = input.trim();
	try {
		const url = new URL(trimmed);
		const c = url.searchParams.get("c");
		if (c) return normalizeTicketCode(c);
	} catch {
		/* not a URL */
	}
	const match = trimmed.match(/[?&]c=([A-Za-z0-9-]+)/i);
	if (match?.[1]) return normalizeTicketCode(match[1]);
	return normalizeTicketCode(trimmed);
}

export function newIdempotencyKey(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `idemp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
