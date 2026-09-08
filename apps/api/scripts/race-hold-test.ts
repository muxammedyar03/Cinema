/**
 * Phase 09 done check: two parallel holds on the same seat — one wins.
 *
 * Usage (API running + published session with free seats):
 *   pnpm --filter @cinema/api exec tsx scripts/race-hold-test.ts
 */
import { PrismaClient } from "@prisma/client";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const prisma = new PrismaClient();

async function login(telegramId: string, username: string) {
	const res = await fetch(`${API}/auth/telegram`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ telegramId, username }),
	});
	if (!res.ok) throw new Error(`login ${telegramId}: ${await res.text()}`);
	const raw =
		typeof res.headers.getSetCookie === "function"
			? res.headers.getSetCookie()[0]
			: (res.headers.get("set-cookie") ?? undefined);
	if (!raw) throw new Error("No session cookie");
	return raw.split(";")[0] ?? raw;
}

async function hold(cookie: string, sessionId: string, seatIds: string[]) {
	const res = await fetch(`${API}/bookings/hold`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: cookie,
		},
		body: JSON.stringify({ sessionId, seatIds }),
	});
	return { ok: res.ok, status: res.status, body: await res.text() };
}

async function main() {
	const session = await prisma.session.findFirst({
		where: { status: "PUBLISHED", cinema: { status: "ACTIVE" } },
		include: {
			sessionSeats: {
				where: { status: "AVAILABLE", seat: { type: { not: "BLOCKED" } } },
				take: 1,
				include: { seat: true },
			},
		},
	});
	const free = session?.sessionSeats[0];
	if (!session || !free) {
		console.error("Need a PUBLISHED session with ≥1 AVAILABLE seat. Create + publish one first.");
		process.exit(1);
	}

	const seatId = free.seatId;
	console.log(
		`Racing on session=${session.id} seat=${free.seat.rowLabel}${free.seat.number} (${seatId})`,
	);

	const [c1, c2] = await Promise.all([
		login("race-user-a", "race_a"),
		login("race-user-b", "race_b"),
	]);

	const [a, b] = await Promise.all([
		hold(c1, session.id, [seatId]),
		hold(c2, session.id, [seatId]),
	]);

	const wins = [a, b].filter((r) => r.ok).length;
	const loses = [a, b].filter((r) => !r.ok).length;
	console.log("A:", a.status, a.body.slice(0, 160));
	console.log("B:", b.status, b.body.slice(0, 160));

	if (wins === 1 && loses === 1) {
		console.log("PASS: exactly one hold succeeded (race safe)");
		process.exit(0);
	}
	console.error(`FAIL: wins=${wins} loses=${loses} (expected 1/1)`);
	process.exit(1);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
