import { randomBytes } from "node:crypto";
import type { SessionUser } from "@cinema/types";
import { normalizeLogin } from "@cinema/validation";
import {
	BadRequestException,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { TelegramInitDataError, verifyTelegramInitData } from "./telegram-init-data";

const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

const staffInclude = {
	where: { active: true },
	include: { cinema: { select: { name: true, status: true } } },
} as const;

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {}

	async login(input: {
		email?: string;
		login?: string;
		password: string;
	}): Promise<{ sid: string; user: SessionUser }> {
		const user = input.email
			? await this.prisma.user.findUnique({
					where: { email: input.email.toLowerCase() },
					include: { staffOf: staffInclude },
				})
			: await this.prisma.user.findUnique({
					where: { login: normalizeLogin(input.login ?? "") },
					include: { staffOf: staffInclude },
				});
		const password = input.password;
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
		const sid = await this.createSession(user.id);
		return { sid, user: sessionUser };
	}

	async changePassword(
		userId: string,
		input: { currentPassword: string; newPassword: string },
	): Promise<{ ok: true; mustChangePassword: false }> {
		const dbUser = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!dbUser?.passwordHash) {
			throw new BadRequestException({
				statusCode: 400,
				code: "NO_PASSWORD",
				message: "У аккаунта нет пароля",
			});
		}
		const ok = await compare(input.currentPassword, dbUser.passwordHash);
		if (!ok) {
			throw new BadRequestException({
				statusCode: 400,
				code: "INVALID_CURRENT_PASSWORD",
				message: "Текущий пароль неверен",
			});
		}
		await this.prisma.user.update({
			where: { id: userId },
			data: {
				passwordHash: await hash(input.newPassword, 10),
				mustChangePassword: false,
			},
		});
		return { ok: true, mustChangePassword: false };
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
			include: { staffOf: staffInclude },
		});
		if (!user) {
			return null;
		}
		return toSessionUser(user);
	}

	/**
	 * Authenticate Mini App user via Telegram initData HMAC (KAN-5 / telegram-auth.md).
	 * Resolution of initData is done by the controller (header > body).
	 */
	async telegramAuth(initData: string | undefined): Promise<{
		sid: string;
		user: SessionUser;
		stub: boolean;
	}> {
		const botToken = this.config.get<string>("TELEGRAM_BOT_TOKEN")?.trim() ?? "";
		const stubAllowed =
			process.env.NODE_ENV !== "production" &&
			(this.config.get<string>("AUTH_TELEGRAM_STUB") === "1" || !botToken);

		if (!botToken) {
			if (!stubAllowed) {
				throw new ServiceUnavailableException({
					code: "BOT_TOKEN_UNCONFIGURED",
					message: "TELEGRAM_BOT_TOKEN is not configured",
				});
			}
			return this.telegramDevStub();
		}

		if (!initData?.trim()) {
			throw new UnauthorizedException({
				code: "INIT_DATA_REQUIRED",
				message: "initData required",
			});
		}

		const maxAgeSec = Number(this.config.get("TELEGRAM_AUTH_MAX_AGE_SEC") ?? 86_400);
		let tgUser: ReturnType<typeof verifyTelegramInitData>;
		try {
			tgUser = verifyTelegramInitData(initData, botToken, maxAgeSec);
		} catch (err) {
			if (err instanceof TelegramInitDataError) {
				throw new UnauthorizedException({ code: err.code, message: err.code });
			}
			throw err;
		}

		const telegramId = String(tgUser.id);
		const user = await this.prisma.user.upsert({
			where: { telegramId },
			update: {
				telegramUsername: tgUser.username ?? null,
				firstName: tgUser.first_name ?? null,
				lastName: tgUser.last_name ?? null,
			},
			create: {
				telegramId,
				telegramUsername: tgUser.username ?? null,
				firstName: tgUser.first_name ?? null,
				lastName: tgUser.last_name ?? null,
				role: "CUSTOMER",
			},
			include: { staffOf: staffInclude },
		});
		const sessionUser = toSessionUser(user);
		const sid = await this.createSession(user.id);
		return { sid, user: sessionUser, stub: false };
	}

	/** Local-only escape hatch when token unset and AUTH_TELEGRAM_STUB=1 / non-production. */
	private async telegramDevStub(): Promise<{
		sid: string;
		user: SessionUser;
		stub: boolean;
	}> {
		const telegramId = "dev-telegram-user";
		const user = await this.prisma.user.upsert({
			where: { telegramId },
			update: {},
			create: {
				telegramId,
				telegramUsername: "dev",
				role: "CUSTOMER",
			},
			include: { staffOf: staffInclude },
		});
		const sid = await this.createSession(user.id);
		return { sid, user: toSessionUser(user), stub: true };
	}

	private async createSession(userId: string): Promise<string> {
		const sid = randomBytes(32).toString("hex");
		await this.redis.client.set(
			`session:${sid}`,
			JSON.stringify({ userId }),
			"EX",
			SESSION_TTL_SEC,
		);
		return sid;
	}
}

function toSessionUser(user: {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	mustChangePassword: boolean;
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
		firstName: user.firstName,
		lastName: user.lastName,
		mustChangePassword: user.mustChangePassword,
		role: user.role,
		staff: user.staffOf.map((s) => ({
			cinemaId: s.cinemaId,
			cinemaName: s.cinema.name,
			cinemaStatus: s.cinema.status,
			role: s.role,
		})),
	};
}
