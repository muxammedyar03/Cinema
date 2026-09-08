import { randomBytes } from "node:crypto";
import type { SessionUser } from "@cinema/types";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compare } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {}

	async login(email: string, password: string): Promise<{ sid: string; user: SessionUser }> {
		const user = await this.prisma.user.findUnique({
			where: { email: email.toLowerCase() },
			include: {
				staffOf: { include: { cinema: { select: { name: true, status: true } } } },
			},
		});
		if (!user?.passwordHash) {
			throw new UnauthorizedException("Invalid credentials");
		}
		const ok = await compare(password, user.passwordHash);
		if (!ok) {
			throw new UnauthorizedException("Invalid credentials");
		}
		if (user.role !== "SUPER_ADMIN" && user.staffOf.length === 0) {
			throw new UnauthorizedException("Not an admin user");
		}
		const sessionUser = toSessionUser(user);
		const sid = randomBytes(32).toString("hex");
		await this.redis.client.set(
			`session:${sid}`,
			JSON.stringify({ userId: user.id }),
			"EX",
			SESSION_TTL_SEC,
		);
		return { sid, user: sessionUser };
	}

	async logout(sid: string | undefined) {
		if (sid) {
			await this.redis.client.del(`session:${sid}`);
		}
	}

	async getSessionUser(sid: string): Promise<SessionUser | null> {
		const raw = await this.redis.client.get(`session:${sid}`);
		if (!raw) {
			return null;
		}
		const { userId } = JSON.parse(raw) as { userId: string };
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				staffOf: { include: { cinema: { select: { name: true, status: true } } } },
			},
		});
		if (!user) {
			return null;
		}
		return toSessionUser(user);
	}

	async telegramStub(body: { initData?: string; telegramId?: string; username?: string }) {
		if (this.config.get("TELEGRAM_BOT_TOKEN")) {
			if (!body.initData) {
				throw new UnauthorizedException("initData required");
			}
		}
		const telegramId = body.telegramId ?? "dev-telegram-user";
		const user = await this.prisma.user.upsert({
			where: { telegramId },
			update: { telegramUsername: body.username },
			create: {
				telegramId,
				telegramUsername: body.username,
				role: "CUSTOMER",
			},
			include: { staffOf: { include: { cinema: { select: { name: true, status: true } } } } },
		});
		const sessionUser = toSessionUser(user);
		const sid = randomBytes(32).toString("hex");
		await this.redis.client.set(
			`session:${sid}`,
			JSON.stringify({ userId: user.id }),
			"EX",
			SESSION_TTL_SEC,
		);
		return { sid, user: sessionUser, stub: true as const };
	}
}

function toSessionUser(user: {
	id: string;
	email: string | null;
	role: "CUSTOMER" | "SUPER_ADMIN";
	staffOf: Array<{
		cinemaId: string;
		role: "CINEMA_ADMIN" | "STAFF";
		cinema: { name: string; status: "ACTIVE" | "DISABLED" | "LOCKED" };
	}>;
}): SessionUser {
	return {
		id: user.id,
		email: user.email,
		role: user.role,
		staff: user.staffOf.map((s) => ({
			cinemaId: s.cinemaId,
			cinemaName: s.cinema.name,
			cinemaStatus: s.cinema.status,
			role: s.role,
		})),
	};
}
