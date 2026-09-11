import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	CinemaAdminProfile,
	CinemaPhotoDto,
	CinemaSecurityStatus,
	MapProvider,
	SessionUser,
} from "@cinema/types";
import type {
	CinemaLocationInput,
	CreateCinemaPhotoInput,
	PatchCinemaProfileInput,
	PhotoUploadUrlInput,
} from "@cinema/validation";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compare, hash } from "bcryptjs";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
	apiError,
	coordNumber,
	extForContentType,
	isInstagramUrl,
	isProfileComplete,
	locationReady,
	MAX_CINEMA_PHOTOS,
	mapPayload,
	missingSteps,
	normalizeInstagramUrl,
	normalizeTelegramContact,
	PHOTO_MIME,
	stepsFromFlags,
} from "./profile.util";

const PHOTO_DIR = join(process.cwd(), "uploads", "cinemas");
const PUT_TTL_SEC = 10 * 60;
const EMAIL_TTL_SEC = 30 * 60;

type CinemaRow = Awaited<ReturnType<CinemaProfileService["loadCinema"]>>;

@Injectable()
export class CinemaProfileService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {}

	async getProfile(user: SessionUser, cinemaId: string): Promise<CinemaAdminProfile> {
		this.assertRead(user, cinemaId);
		const cinema = await this.loadCinema(cinemaId);
		return this.toProfile(cinema);
	}

	async patchProfile(
		user: SessionUser,
		cinemaId: string,
		input: PatchCinemaProfileInput,
	): Promise<CinemaAdminProfile> {
		this.assertWrite(user, cinemaId);
		const cinema = await this.loadCinema(cinemaId);

		const phones = input.phones?.map((p) => p.trim()).filter(Boolean);
		const instagramUrl =
			input.instagramUrl === undefined
				? cinema.instagramUrl
				: input.instagramUrl
					? normalizeInstagramUrl(input.instagramUrl)
					: null;
		if (instagramUrl && !isInstagramUrl(instagramUrl)) {
			apiError(400, "INVALID_INSTAGRAM_URL", "Instagram URL host must be instagram.com");
		}
		const telegramContact =
			input.telegramContact === undefined
				? cinema.telegramContact
				: input.telegramContact
					? normalizeTelegramContact(input.telegramContact)
					: null;

		if (input.mapProvider && input.mapProvider !== "google" && input.mapProvider !== "yandex") {
			apiError(400, "INVALID_MAP_PROVIDER", "Map provider must be google or yandex");
		}

		const next = {
			name: input.name ?? cinema.name,
			address: input.address !== undefined ? input.address : cinema.address,
			description: input.description !== undefined ? input.description : cinema.description,
			logoUrl: input.logoUrl !== undefined ? input.logoUrl : cinema.logoUrl,
			phones: phones ?? cinema.phones,
			phone: phones?.[0] ?? cinema.phone,
			instagramUrl,
			telegramContact,
			lat: input.lat !== undefined ? input.lat : coordNumber(cinema.lat),
			lng: input.lng !== undefined ? input.lng : coordNumber(cinema.lng),
			mapProvider:
				input.mapProvider !== undefined
					? input.mapProvider
					: (cinema.mapProvider as MapProvider | null),
		};

		const flags = {
			stepPhotosDone: cinema.stepPhotosDone,
			stepLocationDone: cinema.stepLocationDone,
			stepInstagramDone: cinema.stepInstagramDone,
			stepPhonesDone: cinema.stepPhonesDone,
			stepTelegramContactDone: cinema.stepTelegramContactDone,
			stepSecurityEmailDone: cinema.stepSecurityEmailDone,
		};

		if (input.markSteps?.photos) {
			this.assertStep("photos", cinema.photos.length >= 1, "Need at least one photo");
			flags.stepPhotosDone = true;
		}
		if (input.markSteps?.location) {
			this.assertStep(
				"location",
				locationReady({
					lat: next.lat,
					lng: next.lng,
					mapProvider: next.mapProvider,
					address: next.address,
				}),
				"lat, lng, mapProvider and address are required",
			);
			flags.stepLocationDone = true;
		} else if (
			locationReady({
				lat: next.lat,
				lng: next.lng,
				mapProvider: next.mapProvider,
				address: next.address,
			})
		) {
			flags.stepLocationDone = true;
		}
		if (input.markSteps?.instagram) {
			this.assertStep("instagram", Boolean(next.instagramUrl), "instagramUrl required");
			flags.stepInstagramDone = true;
		} else if (next.instagramUrl) {
			flags.stepInstagramDone = true;
		}
		if (input.markSteps?.phones) {
			this.assertStep("phones", next.phones.length >= 1, "At least one phone required");
			flags.stepPhonesDone = true;
		} else if (next.phones.length >= 1) {
			flags.stepPhonesDone = true;
		}
		if (input.markSteps?.telegramContact) {
			this.assertStep("telegramContact", Boolean(next.telegramContact), "telegramContact required");
			flags.stepTelegramContactDone = true;
		} else if (next.telegramContact) {
			flags.stepTelegramContactDone = true;
		}
		if (input.markSteps?.securityEmail) {
			const ok = await this.securityEmailSatisfied(cinemaId);
			this.assertStep("securityEmail", ok, "Verified staff email required");
			flags.stepSecurityEmailDone = true;
		}

		await this.prisma.cinema.update({
			where: { id: cinemaId },
			data: {
				name: next.name,
				address: next.address,
				description: next.description,
				logoUrl: next.logoUrl,
				phones: next.phones,
				phone: next.phone,
				instagramUrl: next.instagramUrl,
				telegramContact: next.telegramContact,
				lat: next.lat,
				lng: next.lng,
				mapProvider: next.mapProvider,
				...flags,
				profileComplete: isProfileComplete(flags),
			},
		});
		return this.getProfile(user, cinemaId);
	}

	async setLocation(user: SessionUser, cinemaId: string, input: CinemaLocationInput) {
		this.assertWrite(user, cinemaId);
		await this.loadCinema(cinemaId);
		const flags = await this.applyLocation(cinemaId, input);
		await this.prisma.cinema.update({
			where: { id: cinemaId },
			data: {
				mapProvider: input.provider,
				lat: input.lat,
				lng: input.lng,
				address: input.address,
				stepLocationDone: true,
				profileComplete: isProfileComplete({ ...flags, stepLocationDone: true }),
			},
		});
		return this.getProfile(user, cinemaId);
	}

	async createUploadUrl(user: SessionUser, cinemaId: string, input: PhotoUploadUrlInput) {
		this.assertWrite(user, cinemaId);
		await this.loadCinema(cinemaId);
		if (!PHOTO_MIME.has(input.contentType)) {
			apiError(400, "INVALID_PHOTO_TYPE", "Допустимы JPEG, PNG или WebP");
		}
		if (input.byteSize && input.byteSize > 5 * 1024 * 1024) {
			apiError(400, "PHOTO_TOO_LARGE", "Максимум 5 МБ");
		}
		const count = await this.prisma.cinemaPhoto.count({ where: { cinemaId } });
		if (count >= MAX_CINEMA_PHOTOS) {
			apiError(400, "PHOTO_LIMIT", "Maximum 12 photos");
		}
		this.ensurePhotoDir();
		const filename = `${randomUUID()}${extForContentType(input.contentType)}`;
		const token = randomUUID();
		const publicUrl = `${this.publicBase()}/uploads/cinemas/${filename}`;
		await this.redis.client.set(
			`cinema-photo-put:${token}`,
			JSON.stringify({ cinemaId, filename, contentType: input.contentType }),
			"EX",
			PUT_TTL_SEC,
		);
		return {
			uploadUrl: `${this.publicBase()}/admin/cinemas/${cinemaId}/photos/put/${token}`,
			publicUrl,
			headers: { "Content-Type": input.contentType },
			expiresAt: new Date(Date.now() + PUT_TTL_SEC * 1000).toISOString(),
		};
	}

	async putUploadedBytes(
		cinemaId: string,
		token: string,
		body: Buffer | undefined,
		contentType?: string,
	) {
		const raw = await this.redis.client.get(`cinema-photo-put:${token}`);
		if (!raw) {
			apiError(400, "UPLOAD_EXPIRED", "Upload URL expired");
		}
		const slot = JSON.parse(raw) as { cinemaId: string; filename: string; contentType: string };
		if (slot.cinemaId !== cinemaId) {
			apiError(403, "NOT_CINEMA_STAFF", "Upload does not belong to this cinema");
		}
		if (!body || body.length === 0) {
			apiError(400, "EMPTY_UPLOAD", "Empty file");
		}
		if (body.length > 5 * 1024 * 1024) {
			apiError(400, "PHOTO_TOO_LARGE", "Максимум 5 МБ");
		}
		if (contentType && contentType !== slot.contentType && !PHOTO_MIME.has(contentType)) {
			apiError(400, "INVALID_PHOTO_TYPE", "Допустимы JPEG, PNG или WebP");
		}
		this.ensurePhotoDir();
		writeFileSync(join(PHOTO_DIR, slot.filename), body);
		await this.redis.client.del(`cinema-photo-put:${token}`);
		return {
			ok: true as const,
			publicUrl: `${this.publicBase()}/uploads/cinemas/${slot.filename}`,
		};
	}

	async addPhoto(user: SessionUser, cinemaId: string, input: CreateCinemaPhotoInput) {
		this.assertWrite(user, cinemaId);
		const cinema = await this.loadCinema(cinemaId);
		if (cinema.photos.length >= MAX_CINEMA_PHOTOS) {
			apiError(400, "PHOTO_LIMIT", "Maximum 12 photos");
		}
		const sortOrder = input.sortOrder ?? (cinema.photos.at(-1)?.sortOrder ?? -1) + 1;
		await this.prisma.cinemaPhoto.create({
			data: { cinemaId, url: input.url, sortOrder },
		});
		await this.prisma.cinema.update({
			where: { id: cinemaId },
			data: {
				stepPhotosDone: true,
				profileComplete: isProfileComplete({
					stepPhotosDone: true,
					stepLocationDone: cinema.stepLocationDone,
					stepInstagramDone: cinema.stepInstagramDone,
					stepPhonesDone: cinema.stepPhonesDone,
					stepTelegramContactDone: cinema.stepTelegramContactDone,
					stepSecurityEmailDone: cinema.stepSecurityEmailDone,
				}),
			},
		});
		return this.getProfile(user, cinemaId);
	}

	async reorderPhotos(user: SessionUser, cinemaId: string, photoIds: string[]) {
		this.assertWrite(user, cinemaId);
		const cinema = await this.loadCinema(cinemaId);
		const existing = new Set(cinema.photos.map((p) => p.id));
		if (photoIds.length !== existing.size || photoIds.some((id) => !existing.has(id))) {
			apiError(400, "PHOTO_REORDER_INVALID", "photoIds must list every photo");
		}
		await this.prisma.$transaction(
			photoIds.map((id, index) =>
				this.prisma.cinemaPhoto.update({ where: { id }, data: { sortOrder: index } }),
			),
		);
		return this.getProfile(user, cinemaId);
	}

	async deletePhoto(user: SessionUser, cinemaId: string, photoId: string) {
		this.assertWrite(user, cinemaId);
		const cinema = await this.loadCinema(cinemaId);
		const photo = cinema.photos.find((p) => p.id === photoId);
		if (!photo) {
			apiError(404, "PHOTO_NOT_FOUND", "Photo not found");
		}
		await this.prisma.cinemaPhoto.delete({ where: { id: photoId } });
		const remaining = cinema.photos.length - 1;
		const flags = {
			stepPhotosDone: remaining >= 1,
			stepLocationDone: cinema.stepLocationDone,
			stepInstagramDone: cinema.stepInstagramDone,
			stepPhonesDone: cinema.stepPhonesDone,
			stepTelegramContactDone: cinema.stepTelegramContactDone,
			stepSecurityEmailDone: cinema.stepSecurityEmailDone,
		};
		await this.prisma.cinema.update({
			where: { id: cinemaId },
			data: { ...flags, profileComplete: isProfileComplete(flags) },
		});
		return this.getProfile(user, cinemaId);
	}

	async securityStatus(user: SessionUser, cinemaId: string): Promise<CinemaSecurityStatus> {
		this.assertRead(user, cinemaId);
		const cinema = await this.loadCinema(cinemaId);
		const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
		return {
			hasPassword: Boolean(dbUser?.passwordHash),
			email: dbUser?.email ?? null,
			emailVerified: Boolean(dbUser?.emailVerifiedAt),
			stepSecurityEmailDone: cinema.stepSecurityEmailDone,
		};
	}

	async changePassword(
		user: SessionUser,
		cinemaId: string,
		input: { currentPassword: string; newPassword: string },
	) {
		this.assertWrite(user, cinemaId);
		const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
		if (!dbUser?.passwordHash) {
			apiError(400, "NO_PASSWORD", "У аккаунта нет пароля");
		}
		const ok = await compare(input.currentPassword, dbUser.passwordHash);
		if (!ok) {
			apiError(400, "INVALID_CURRENT_PASSWORD", "Текущий пароль неверен");
		}
		await this.prisma.user.update({
			where: { id: user.id },
			data: { passwordHash: await hash(input.newPassword, 10) },
		});
		return { ok: true as const };
	}

	async linkEmail(user: SessionUser, cinemaId: string, email: string) {
		this.assertWrite(user, cinemaId);
		const normalized = email.toLowerCase().trim();
		const taken = await this.prisma.user.findFirst({
			where: { email: normalized, NOT: { id: user.id } },
		});
		if (taken) {
			apiError(409, "EMAIL_TAKEN", "Email уже занят");
		}
		await this.prisma.user.update({
			where: { id: user.id },
			data: { email: normalized, emailVerifiedAt: null },
		});
		const token = randomBytes(4).toString("hex");
		const tokenHash = createHash("sha256").update(token).digest("hex");
		await this.redis.client.set(
			`email-verify:${tokenHash}`,
			JSON.stringify({ userId: user.id, cinemaId, email: normalized }),
			"EX",
			EMAIL_TTL_SEC,
		);
		const preview = process.env.NODE_ENV !== "production" ? token : undefined;
		return {
			sent: true as const,
			email: normalized,
			emailVerified: false,
			previewToken: preview,
		};
	}

	async confirmEmail(user: SessionUser, cinemaId: string, token: string) {
		this.assertWrite(user, cinemaId);
		const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
		const raw = await this.redis.client.get(`email-verify:${tokenHash}`);
		if (!raw) {
			apiError(400, "INVALID_EMAIL_TOKEN", "Код подтверждения недействителен");
		}
		const payload = JSON.parse(raw) as { userId: string; cinemaId: string; email: string };
		if (payload.userId !== user.id) {
			apiError(403, "NOT_CINEMA_STAFF", "Token belongs to another user");
		}
		await this.prisma.user.update({
			where: { id: user.id },
			data: { email: payload.email, emailVerifiedAt: new Date() },
		});
		await this.redis.client.del(`email-verify:${tokenHash}`);
		const cinema = await this.loadCinema(cinemaId);
		const flags = {
			stepPhotosDone: cinema.stepPhotosDone,
			stepLocationDone: cinema.stepLocationDone,
			stepInstagramDone: cinema.stepInstagramDone,
			stepPhonesDone: cinema.stepPhonesDone,
			stepTelegramContactDone: cinema.stepTelegramContactDone,
			stepSecurityEmailDone: true,
		};
		await this.prisma.cinema.update({
			where: { id: cinemaId },
			data: { stepSecurityEmailDone: true, profileComplete: isProfileComplete(flags) },
		});
		return this.securityStatus(user, cinemaId);
	}

	private async applyLocation(cinemaId: string, _input: CinemaLocationInput) {
		const cinema = await this.loadCinema(cinemaId);
		return {
			stepPhotosDone: cinema.stepPhotosDone,
			stepLocationDone: cinema.stepLocationDone,
			stepInstagramDone: cinema.stepInstagramDone,
			stepPhonesDone: cinema.stepPhonesDone,
			stepTelegramContactDone: cinema.stepTelegramContactDone,
			stepSecurityEmailDone: cinema.stepSecurityEmailDone,
		};
	}

	private async securityEmailSatisfied(cinemaId: string): Promise<boolean> {
		const staff = await this.prisma.cinemaStaff.findMany({
			where: { cinemaId, role: "CINEMA_ADMIN" },
			include: { user: { select: { email: true, emailVerifiedAt: true } } },
		});
		if (staff.some((s) => s.user.email && s.user.emailVerifiedAt)) return true;
		return false;
	}

	private async loadCinema(id: string) {
		const cinema = await this.prisma.cinema.findUnique({
			where: { id },
			include: { photos: { orderBy: { sortOrder: "asc" } } },
		});
		if (!cinema) {
			apiError(404, "CINEMA_NOT_FOUND", "Cinema not found");
		}
		return cinema;
	}

	private toProfile(cinema: NonNullable<CinemaRow>): CinemaAdminProfile {
		const flags = {
			stepPhotosDone: cinema.stepPhotosDone,
			stepLocationDone: cinema.stepLocationDone,
			stepInstagramDone: cinema.stepInstagramDone,
			stepPhonesDone: cinema.stepPhonesDone,
			stepTelegramContactDone: cinema.stepTelegramContactDone,
			stepSecurityEmailDone: cinema.stepSecurityEmailDone,
		};
		const steps = stepsFromFlags(flags);
		const photos: CinemaPhotoDto[] = cinema.photos.map((p) => ({
			id: p.id,
			url: p.url,
			sortOrder: p.sortOrder,
		}));
		return {
			id: cinema.id,
			name: cinema.name,
			address: cinema.address,
			phone: cinema.phone,
			phones: cinema.phones,
			logoUrl: cinema.logoUrl,
			description: cinema.description,
			timezone: cinema.timezone,
			status: cinema.status,
			lat: coordNumber(cinema.lat),
			lng: coordNumber(cinema.lng),
			mapProvider: cinema.mapProvider,
			instagramUrl: cinema.instagramUrl,
			telegramContact: cinema.telegramContact,
			photos,
			profileCompletion: {
				profileComplete: isProfileComplete(flags),
				steps,
				missing: missingSteps(steps),
			},
			map: mapPayload({
				mapProvider: cinema.mapProvider,
				lat: cinema.lat,
				lng: cinema.lng,
				address: cinema.address,
			}),
		};
	}

	private assertRead(user: SessionUser, cinemaId: string) {
		if (!canAccessCinema(user, cinemaId)) {
			apiError(403, "NOT_CINEMA_STAFF", "User is not staff of this cinema");
		}
	}

	private assertWrite(user: SessionUser, cinemaId: string) {
		if (!canManageCinema(user, cinemaId)) {
			apiError(403, "NOT_CINEMA_STAFF", "User is not staff of this cinema");
		}
	}

	private assertStep(step: string, ok: boolean, reason: string) {
		if (!ok) {
			apiError(400, "STEP_PRECONDITION_FAILED", reason, { step, reason });
		}
	}

	private publicBase() {
		return (
			this.config.get<string>("PUBLIC_API_URL") ??
			this.config.get<string>("NEXT_PUBLIC_API_URL") ??
			"http://localhost:3001"
		).replace(/\/$/, "");
	}

	private ensurePhotoDir() {
		if (!existsSync(PHOTO_DIR)) {
			mkdirSync(PHOTO_DIR, { recursive: true });
		}
	}
}
