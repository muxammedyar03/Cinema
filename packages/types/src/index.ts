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
