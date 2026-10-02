import { z } from "zod";

/** Staff sign-in name. Stored lowercased; not an email address. */
export function normalizeLogin(login: string): string {
	return login.trim().toLowerCase();
}

const loginNameSchema = z
	.string()
	.trim()
	.min(3, "Логин должен быть не короче 3 символов")
	.max(64)
	.regex(/^[A-Za-z0-9._-]+$/, "Логин: латиница, цифры, точка, дефис или подчёркивание");

export const loginSchema = z
	.object({
		email: z.string().email().optional(),
		login: loginNameSchema.optional(),
		password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
	})
	.refine((value) => Boolean(value.email || value.login), {
		message: "Укажите email или логин",
	});

export const createCinemaSchema = z.object({
	name: z.string().min(2).max(120),
	address: z.string().max(255).optional(),
	phone: z.string().max(40).optional(),
	description: z.string().max(2000).optional(),
	timezone: z.string().default("Asia/Tashkent"),
	city: z.string().max(80).optional(),
	tagline: z.string().max(160).optional(),
});

export const updateCinemaSchema = createCinemaSchema.partial();

/** Super Admin: create client + first Cinema Admin + billing */
export const createClientSchema = z.object({
	name: z.string().min(2).max(120),
	address: z.string().max(255).optional(),
	phone: z.string().max(40).optional(),
	description: z.string().max(2000).optional(),
	timezone: z.string().default("Asia/Tashkent"),
	city: z.string().max(80).optional(),
	tagline: z.string().max(160).optional(),
	monthlyPlanUzs: z.number().int().positive().default(2_500_000),
	commissionPerTicketUzs: z.number().int().nonnegative().nullable().optional(),
	admin: z.object({
		email: z.string().email(),
		password: z.string().min(8).max(128),
		firstName: z.string().min(1).max(80).optional(),
		lastName: z.string().min(1).max(80).optional(),
	}),
});

export const createStaffSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(128),
	firstName: z.string().min(1).max(80).optional(),
	lastName: z.string().min(1).max(80).optional(),
	role: z.enum(["CINEMA_ADMIN", "STAFF"]).default("STAFF"),
});

export const updateClientSchema = z.object({
	name: z.string().min(2).max(120).optional(),
	address: z.string().max(255).nullable().optional(),
	phone: z.string().max(40).nullable().optional(),
	description: z.string().max(2000).nullable().optional(),
	city: z.string().max(80).nullable().optional(),
	tagline: z.string().max(160).nullable().optional(),
	timezone: z.string().min(1).optional(),
	monthlyPlanUzs: z.number().int().positive().optional(),
	commissionPerTicketUzs: z.number().int().nonnegative().nullable().optional(),
});

export const cinemaStatusSchema = z.object({
	status: z.enum(["ACTIVE", "DISABLED", "LOCKED"]),
});

export const platformSettingsSchema = z.object({
	defaultCommissionUzs: z.number().int().nonnegative().optional(),
	lockAfterDays: z.number().int().min(1).max(90).optional(),
	notifyHourTashkent: z.number().int().min(0).max(23).optional(),
	notifyTelegram: z.boolean().optional(),
	notifyApp: z.boolean().optional(),
	lateMessageTemplate: z.string().min(10).max(2000).optional(),
});

export const cinemaBillingSchema = z.object({
	monthlyPlanUzs: z.number().int().positive(),
	commissionPerTicketUzs: z.number().int().nonnegative().nullable().optional(),
});

export const markInvoicePaidSchema = z.object({
	invoiceId: z.string().min(1),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;
export type CinemaBillingInput = z.infer<typeof cinemaBillingSchema>;

export const createHallSchema = z.object({
	name: z.string().min(1).max(80),
	capacity: z.number().int().positive(),
	format: z.string().max(80).nullable().optional(),
});

export const updateHallSchema = createHallSchema.partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCinemaInput = z.infer<typeof createCinemaSchema>;
export type UpdateCinemaInput = z.infer<typeof updateCinemaSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type CreateHallInput = z.infer<typeof createHallSchema>;
export type UpdateHallInput = z.infer<typeof updateHallSchema>;

export const layoutSchema = z
	.object({
		expectedVersion: z.number().int().nonnegative(),
		canvasWidth: z.number().int().min(200).max(3000),
		canvasHeight: z.number().int().min(200).max(3000),
		seats: z
			.array(
				z.object({
					rowLabel: z.string().trim().min(1).max(8),
					number: z.number().int().positive().max(999),
					type: z.enum(["STANDARD", "VIP", "BLOCKED"]),
					x: z.number().finite().nonnegative(),
					y: z.number().finite().nonnegative(),
					rotation: z.number().finite().min(-360).max(360).default(0),
				}),
			)
			.max(2000),
	})
	.superRefine((layout, ctx) => {
		const labels = new Set<string>();
		for (const seat of layout.seats) {
			const key = `${seat.rowLabel}:${seat.number}`;
			if (labels.has(key)) ctx.addIssue({ code: "custom", message: "Seat labels must be unique" });
			labels.add(key);
			if (seat.x > layout.canvasWidth - 32 || seat.y > layout.canvasHeight - 32)
				ctx.addIssue({ code: "custom", message: "Seat outside canvas" });
		}
	});
export type LayoutInput = z.infer<typeof layoutSchema>;

export const AUDIO_LANGUAGES = ["ru", "uz", "en"] as const;
export type AudioLanguage = (typeof AUDIO_LANGUAGES)[number];

export const createMovieSchema = z.object({
	title: z.string().trim().min(1).max(200),
	description: z.string().max(4000).optional().or(z.literal("")),
	posterUrl: z.string().url().max(500).optional().or(z.literal("")),
	durationMin: z.number().int().min(1).max(600),
	rating: z.number().min(0).max(10).optional().nullable(),
	ageRating: z.string().max(12).optional().or(z.literal("")),
	genres: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
	audioLanguages: z.array(z.enum(AUDIO_LANGUAGES)).max(3).optional().default([]),
	releasedAt: z.coerce.date().optional().nullable(),
	/** Super Admin only — otherwise taken from staff cinema */
	cinemaId: z.string().min(1).optional(),
	/** At most one featured movie per cinema; enforced in the write transaction. */
	isFeatured: z.boolean().optional(),
});

export const updateMovieSchema = createMovieSchema.partial().extend({
	status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const createSessionSchema = z.object({
	movieId: z.string().min(1),
	cinemaId: z.string().min(1),
	hallId: z.string().min(1),
	startsAt: z.coerce.date(),
	basePriceUzs: z.number().int().positive(),
	discountPercent: z.number().int().min(0).max(100).default(0),
	vipPriceUzs: z.number().int().positive().optional(),
	/** Capacity-only tickets — no seat map on the session */
	generalAdmission: z.boolean().optional().default(false),
	/** Spoken language of this showing. Omitted or null stays unset. */
	audioLanguage: z.enum(["ru", "uz"]).nullable().optional(),
});

export const updateSessionSchema = z.object({
	startsAt: z.coerce.date().optional(),
	hallId: z.string().min(1).optional(),
	basePriceUzs: z.number().int().positive().optional(),
	discountPercent: z.number().int().min(0).max(100).optional(),
	vipPriceUzs: z.number().int().positive().optional(),
	generalAdmission: z.boolean().optional(),
	audioLanguage: z.enum(["ru", "uz"]).nullable().optional(),
});

export const catalogQuerySchema = z.object({
	from: z.preprocess(
		(v) => (v === "" || v === undefined ? undefined : v),
		z.coerce.date().optional(),
	),
	to: z.preprocess(
		(v) => (v === "" || v === undefined ? undefined : v),
		z.coerce.date().optional(),
	),
	cinemaId: z.preprocess(
		(v) => (v === "" || v === undefined ? undefined : v),
		z.string().min(1).optional(),
	),
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const holdSeatsSchema = z.object({
	sessionId: z.string().min(1),
	seatIds: z.array(z.string().min(1)).min(1).max(10),
});

export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;

export const holdGaSchema = z.object({
	sessionId: z.string().min(1),
	quantity: z.number().int().min(1).max(20),
});

export type HoldGaInput = z.infer<typeof holdGaSchema>;

export const MAP_PROVIDERS = ["google", "yandex"] as const;
export const PROFILE_STEP_KEYS = [
	"photos",
	"location",
	"instagram",
	"phones",
	"telegramContact",
	"securityEmail",
] as const;

export const photoUploadUrlSchema = z.object({
	contentType: z.string().min(1).max(80),
	byteSize: z
		.number()
		.int()
		.positive()
		.max(5 * 1024 * 1024)
		.optional(),
});

export const createCinemaPhotoSchema = z.object({
	url: z.string().url().max(1000),
	sortOrder: z.number().int().min(0).max(99).optional(),
	caption: z.string().max(160).nullable().optional(),
});

export const reorderCinemaPhotosSchema = z.object({
	photoIds: z.array(z.string().min(1)).min(1).max(12),
});

export const cinemaLocationSchema = z.object({
	provider: z.enum(MAP_PROVIDERS),
	lat: z.number().gte(-90).lte(90),
	lng: z.number().gte(-180).lte(180),
	address: z.string().trim().min(1).max(255),
});

export const patchCinemaProfileSchema = z.object({
	name: z.string().min(2).max(120).optional(),
	address: z.string().max(255).nullable().optional(),
	description: z.string().max(2000).nullable().optional(),
	logoUrl: z.string().url().max(500).nullable().optional(),
	phones: z.array(z.string().trim().min(3).max(40)).max(8).optional(),
	instagramUrl: z.string().trim().max(300).nullable().optional(),
	telegramContact: z.string().trim().max(120).nullable().optional(),
	lat: z.number().gte(-90).lte(90).nullable().optional(),
	lng: z.number().gte(-180).lte(180).nullable().optional(),
	mapProvider: z.enum(MAP_PROVIDERS).nullable().optional(),
	city: z.string().max(80).nullable().optional(),
	tagline: z.string().max(160).nullable().optional(),
	markSteps: z
		.object({
			photos: z.boolean().optional(),
			location: z.boolean().optional(),
			instagram: z.boolean().optional(),
			phones: z.boolean().optional(),
			telegramContact: z.boolean().optional(),
			securityEmail: z.boolean().optional(),
		})
		.optional(),
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1).max(128),
	newPassword: z
		.string()
		.min(8, "Пароль должен быть не короче 8 символов")
		.max(128, "Пароль должен быть не длиннее 128 символов"),
});

export const createStaffSchema = z.object({
	login: loginNameSchema,
	password: z
		.string()
		.min(8, "Пароль должен быть не короче 8 символов")
		.max(128, "Пароль должен быть не длиннее 128 символов"),
	role: z.enum(["CINEMA_ADMIN", "STAFF"]),
	firstName: z.string().trim().max(80).optional(),
	lastName: z.string().trim().max(80).optional(),
	/** Required for SUPER_ADMIN. Cinema admin is scoped to their own cinema. */
	cinemaId: z.string().min(1).optional(),
});

export const updateStaffSchema = z
	.object({
		role: z.enum(["CINEMA_ADMIN", "STAFF"]).optional(),
		active: z.boolean().optional(),
	})
	.refine((value) => value.role !== undefined || value.active !== undefined, {
		message: "Укажите роль или статус",
	});

export const platformListQuerySchema = z.object({
	cursor: z.string().trim().min(1).max(64).optional(),
	limit: z.coerce
		.number({ invalid_type_error: "Укажите предел от 1 до 100" })
		.int()
		.min(1, "Укажите предел от 1 до 100")
		.max(100, "Укажите предел от 1 до 100")
		.optional(),
});

export const linkEmailSchema = z.object({
	email: z.string().email().max(160),
});

export const confirmEmailSchema = z.object({
	token: z.string().trim().max(128),
});

export type PhotoUploadUrlInput = z.infer<typeof photoUploadUrlSchema>;
export type CreateCinemaPhotoInput = z.infer<typeof createCinemaPhotoSchema>;
export type ReorderCinemaPhotosInput = z.infer<typeof reorderCinemaPhotosSchema>;
export type CinemaLocationInput = z.infer<typeof cinemaLocationSchema>;
export type PatchCinemaProfileInput = z.infer<typeof patchCinemaProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type PlatformListQuery = z.infer<typeof platformListQuerySchema>;
export type LinkEmailInput = z.infer<typeof linkEmailSchema>;
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
