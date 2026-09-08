import type { SessionUser } from "@cinema/types";

export type AppRole = "super" | "cinema" | "staff";

export function roleOf(user: SessionUser): AppRole {
	if (user.role === "SUPER_ADMIN") return "super";
	if (user.staff.some((s) => s.role === "CINEMA_ADMIN")) return "cinema";
	return "staff";
}

export function primaryStaff(user: SessionUser) {
	return user.staff.find((s) => s.role === "CINEMA_ADMIN") ?? user.staff[0] ?? null;
}

export function primaryCinemaId(user: SessionUser): string | null {
	return primaryStaff(user)?.cinemaId ?? null;
}

export function primaryCinemaName(user: SessionUser): string | null {
	return primaryStaff(user)?.cinemaName ?? null;
}
