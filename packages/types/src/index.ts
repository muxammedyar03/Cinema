export type AdminRole = "SUPER_ADMIN" | "CINEMA_ADMIN" | "STAFF";

export type CinemaAccessStatus = "ACTIVE" | "DISABLED" | "LOCKED";

export type SessionUser = {
	id: string;
	email: string | null;
	role: "CUSTOMER" | "SUPER_ADMIN";
	staff: Array<{
		cinemaId: string;
		cinemaName: string;
		cinemaStatus: CinemaAccessStatus;
		role: "CINEMA_ADMIN" | "STAFF";
	}>;
};

export type ApiErrorBody = {
	statusCode: number;
	message: string | string[];
	error?: string;
	code?: string;
};

export type MapProvider = "google" | "yandex";

export type ProfileStepKey =
	| "photos"
	| "location"
	| "instagram"
	| "phones"
	| "telegramContact"
	| "securityEmail";

export type CinemaPhotoDto = {
	id: string;
	url: string;
	sortOrder: number;
};

export type CinemaMapPayload = {
	provider: MapProvider;
	lat: number;
	lng: number;
	address: string;
	embedHint: "google-maps" | "yandex-maps";
};

export type CinemaProfileCompletion = {
	profileComplete: boolean;
	steps: Record<ProfileStepKey, boolean>;
	missing: ProfileStepKey[];
};

export type CinemaAdminProfile = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	phones: string[];
	logoUrl: string | null;
	description: string | null;
	timezone: string;
	status: CinemaAccessStatus;
	lat: number | null;
	lng: number | null;
	mapProvider: MapProvider | null;
	instagramUrl: string | null;
	telegramContact: string | null;
	photos: CinemaPhotoDto[];
	profileCompletion: CinemaProfileCompletion;
	map: CinemaMapPayload | null;
};

export type CinemaSecurityStatus = {
	hasPassword: boolean;
	email: string | null;
	emailVerified: boolean;
	stepSecurityEmailDone: boolean;
	previewToken?: string;
};

export type PublicCinemaProfile = {
	id: string;
	name: string;
	address: string | null;
	description: string | null;
	logoUrl: string | null;
	phones: string[];
	instagramUrl: string | null;
	telegramContact: string | null;
	photos: CinemaPhotoDto[];
	map: CinemaMapPayload | null;
	timezone: string;
	followerCount: number;
	followedByMe: boolean;
};
