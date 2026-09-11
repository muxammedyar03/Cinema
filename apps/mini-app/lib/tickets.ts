const ADMIN_ORIGIN = (
	process.env.NEXT_PUBLIC_ADMIN_ORIGIN ??
	process.env.NEXT_PUBLIC_ADMIN_URL ??
	"http://localhost:3000"
).replace(/\/$/, "");

export function normalizeTicketCode(code: string): string {
	return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function displayTicketCode(code: string): string {
	const raw = normalizeTicketCode(code);
	return (raw.match(/.{1,4}/g) ?? [raw]).join("-");
}

/** QR payload per docs/contracts/qr-refund.md */
export function ticketQrPayload(code: string): string {
	const raw = normalizeTicketCode(code);
	return `${ADMIN_ORIGIN}/m/tickets/verify?c=${encodeURIComponent(raw)}`;
}

export const SELF_REFUND_WINDOW_MS = 60 * 60 * 1000;

export function canSelfRefund(startsAt: string, now = Date.now()): boolean {
	return new Date(startsAt).getTime() - now > SELF_REFUND_WINDOW_MS;
}

export function newIdempotencyKey(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `idemp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
