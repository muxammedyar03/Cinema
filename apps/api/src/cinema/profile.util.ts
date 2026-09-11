import type { MapProvider, ProfileStepKey } from "@cinema/types";
import { HttpException } from "@nestjs/common";

export const MAX_CINEMA_PHOTOS = 12;
export const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function apiError(
	status: number,
	code: string,
	message: string,
	extra?: Record<string, unknown>,
): never {
	throw new HttpException({ statusCode: status, code, message, ...extra }, status);
}

export function coordNumber(value: unknown): number | null {
	if (value == null) return null;
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

export function isInstagramUrl(raw: string): boolean {
	try {
		const url = new URL(raw);
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		const host = url.hostname.toLowerCase();
		return host === "instagram.com" || host === "www.instagram.com";
	} catch {
		return false;
	}
}

export function normalizeInstagramUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	if (trimmed.startsWith("@")) {
		return `https://www.instagram.com/${trimmed.slice(1).replace(/^\/+/, "")}/`;
	}
	if (!/^https?:\/\//i.test(trimmed)) {
		const handle = trimmed.replace(/^\/+/, "").replace(/^instagram\.com\//i, "");
		return `https://www.instagram.com/${handle}/`;
	}
	return trimmed;
}

export function normalizeTelegramContact(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	try {
		const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
		const url = new URL(withProto);
		const host = url.hostname.toLowerCase();
		if (
			host === "t.me" ||
			host === "www.t.me" ||
			host === "telegram.me" ||
			host === "www.telegram.me"
		) {
			const user = url.pathname.replace(/^\/+/, "").split("/")[0]?.replace(/^@/, "");
			if (user) return `@${user}`;
		}
	} catch {
		/* not a URL */
	}
	const handle = trimmed.replace(/^@/, "");
	return handle ? `@${handle}` : "";
}

export function instagramHandle(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		const parsed = new URL(normalizeInstagramUrl(url));
		const handle = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
		return handle || null;
	} catch {
		return null;
	}
}

export function mapPayload(input: {
	mapProvider: MapProvider | null;
	lat: unknown;
	lng: unknown;
	address: string | null;
}) {
	const lat = coordNumber(input.lat);
	const lng = coordNumber(input.lng);
	if (lat == null || lng == null || !input.mapProvider) return null;
	return {
		provider: input.mapProvider,
		lat,
		lng,
		address: input.address ?? "",
		embedHint: input.mapProvider === "google" ? ("google-maps" as const) : ("yandex-maps" as const),
	};
}

export type StepFlags = {
	stepPhotosDone: boolean;
	stepLocationDone: boolean;
	stepInstagramDone: boolean;
	stepPhonesDone: boolean;
	stepTelegramContactDone: boolean;
	stepSecurityEmailDone: boolean;
};

export function stepsFromFlags(flags: StepFlags): Record<ProfileStepKey, boolean> {
	return {
		photos: flags.stepPhotosDone,
		location: flags.stepLocationDone,
		instagram: flags.stepInstagramDone,
		phones: flags.stepPhonesDone,
		telegramContact: flags.stepTelegramContactDone,
		securityEmail: flags.stepSecurityEmailDone,
	};
}

export function missingSteps(steps: Record<ProfileStepKey, boolean>): ProfileStepKey[] {
	return (Object.keys(steps) as ProfileStepKey[]).filter((key) => !steps[key]);
}

export function isProfileComplete(flags: StepFlags): boolean {
	return (
		flags.stepPhotosDone &&
		flags.stepLocationDone &&
		flags.stepInstagramDone &&
		flags.stepPhonesDone &&
		flags.stepTelegramContactDone &&
		flags.stepSecurityEmailDone
	);
}

export function locationReady(input: {
	lat: unknown;
	lng: unknown;
	mapProvider: unknown;
	address: string | null | undefined;
}): boolean {
	return (
		coordNumber(input.lat) != null &&
		coordNumber(input.lng) != null &&
		(input.mapProvider === "google" || input.mapProvider === "yandex") &&
		Boolean(input.address?.trim())
	);
}

export function extForContentType(contentType: string): string {
	if (contentType === "image/png") return ".png";
	if (contentType === "image/webp") return ".webp";
	return ".jpg";
}
