export type InvoiceStatusName = "DUE" | "PAID" | "OVERDUE" | "VOID";
export type CinemaStatusName = "ACTIVE" | "DISABLED" | "LOCKED";

export type PlatformCinemaRow = {
	id: string;
	name: string;
	city: string | null;
	status: CinemaStatusName;
	profileComplete: boolean;
	_count: { halls: number; staff: number };
	invoices: Array<{ status: InvoiceStatusName }>;
};

export type PlatformAdminRow = {
	id: string;
	role: "CINEMA_ADMIN" | "STAFF";
	active: boolean;
	user: {
		id: string;
		email: string | null;
		login: string | null;
		firstName: string | null;
		lastName: string | null;
	};
	cinema: {
		id: string;
		name: string;
		city: string | null;
		status: CinemaStatusName;
		profileComplete: boolean;
		invoices: Array<{ status: InvoiceStatusName }>;
	};
};

function emptyToNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function displayName(firstName: string | null, lastName: string | null): string | null {
	const parts = [firstName, lastName]
		.map((part) => part?.trim() ?? "")
		.filter((part) => part.length > 0);
	return parts.length > 0 ? parts.join(" ") : null;
}

export function toPlatformCinema(row: PlatformCinemaRow) {
	const invoice = row.invoices[0] ?? null;
	return {
		id: row.id,
		name: row.name,
		city: emptyToNull(row.city),
		status: row.status,
		profileComplete: row.profileComplete,
		halls: row._count.halls,
		cinemaAdmins: row._count.staff,
		billingStatus: invoice?.status ?? null,
	};
}

export function toPlatformAdmin(row: PlatformAdminRow) {
	const invoice = row.cinema.invoices[0] ?? null;
	return {
		staffId: row.id,
		userId: row.user.id,
		firstName: emptyToNull(row.user.firstName),
		lastName: emptyToNull(row.user.lastName),
		name: displayName(row.user.firstName, row.user.lastName),
		email: emptyToNull(row.user.email),
		login: emptyToNull(row.user.login),
		role: row.role,
		active: row.active,
		cinemaId: row.cinema.id,
		cinemaName: row.cinema.name,
		city: emptyToNull(row.cinema.city),
		profileComplete: row.cinema.profileComplete,
		cinemaStatus: row.cinema.status,
		billingStatus: invoice?.status ?? null,
	};
}

export function pageById<T extends { id: string }, R>(
	rows: T[],
	limit: number,
	map: (row: T) => R,
): { items: R[]; nextCursor: string | null } {
	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	const last = page.at(-1);
	return {
		items: page.map(map),
		nextCursor: hasMore && last ? last.id : null,
	};
}
