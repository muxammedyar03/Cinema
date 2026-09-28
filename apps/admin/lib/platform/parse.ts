import type {
	CinemaDossier,
	CinemaListItem,
	CinemaStatus,
	InvoiceListItem,
	PlatformAdmin,
	PlatformAdminsPage,
	PlatformSummary,
	ProfileBanner,
} from "./types";

function record(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function str(row: Record<string, unknown>, key: string): string | null {
	const value = row[key];
	return typeof value === "string" ? value : null;
}

function trimmed(value: string | null): string | null {
	const next = value?.trim() ?? "";
	return next ? next : null;
}

function boolOrNull(value: unknown): boolean | null {
	return typeof value === "boolean" ? value : null;
}

function intOrNull(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return Math.trunc(value);
}

function countOrNull(value: unknown): number | null {
	const parsed = intOrNull(value);
	if (parsed === null || parsed < 0) return null;
	return parsed;
}

function isCinemaStatus(value: unknown): value is CinemaStatus {
	return value === "ACTIVE" || value === "DISABLED" || value === "LOCKED";
}

function keepParsed<T>(raw: unknown[], parse: (item: unknown) => T | null): T[] | null {
	const items = raw.map(parse).filter((item): item is T => item !== null);
	if (raw.length > 0 && items.length === 0) return null;
	return items;
}

export function parsePlatformSummary(body: unknown): PlatformSummary | null {
	const row = record(body);
	if (!row) return null;
	const cinemas = countOrNull(row.cinemas);
	const cinemasActive = countOrNull(row.cinemasActive);
	const halls = countOrNull(row.halls);
	const cinemaAdmins = countOrNull(row.cinemaAdmins);
	const invoicesUnpaid = countOrNull(row.invoicesUnpaid);
	if (
		cinemas === null ||
		cinemasActive === null ||
		halls === null ||
		cinemaAdmins === null ||
		invoicesUnpaid === null
	) {
		return null;
	}
	return { cinemas, cinemasActive, halls, cinemaAdmins, invoicesUnpaid };
}

export function parseCinemaListItem(body: unknown): CinemaListItem | null {
	const row = record(body);
	if (!row) return null;
	const id = str(row, "id");
	const name = trimmed(str(row, "name"));
	if (!id || !name || !isCinemaStatus(row.status)) return null;
	const count = record(row._count);
	const billing = record(row.billing);
	const invoices = Array.isArray(row.invoices) ? row.invoices : [];
	const latest = record(invoices[0]);
	const billingStatus =
		trimmed(str(row, "billingStatus")) ?? (latest ? trimmed(str(latest, "status")) : null);
	return {
		id,
		name,
		status: row.status,
		city: trimmed(str(row, "city")),
		address: trimmed(str(row, "address")),
		phone: trimmed(str(row, "phone")),
		timezone: trimmed(str(row, "timezone")) ?? "Asia/Tashkent",
		profileComplete: boolOrNull(row.profileComplete),
		halls: count ? countOrNull(count.halls) : null,
		staffCount: count ? countOrNull(count.staff) : null,
		monthlyPlanUzs: billing ? countOrNull(billing.monthlyPlanUzs) : null,
		billingStatus,
	};
}

export function parseCinemaList(body: unknown): CinemaListItem[] | null {
	if (!Array.isArray(body)) return null;
	return keepParsed(body, parseCinemaListItem);
}

function parseAdmin(body: unknown): PlatformAdmin | null {
	const row = record(body);
	if (!row) return null;
	const userId = str(row, "userId");
	const cinemaId = str(row, "cinemaId");
	const cinemaName = trimmed(str(row, "cinemaName"));
	if (!userId || !cinemaId || !cinemaName) return null;
	const explicit = trimmed(str(row, "name"));
	const composed = [trimmed(str(row, "firstName")), trimmed(str(row, "lastName"))]
		.filter(Boolean)
		.join(" ");
	return {
		userId,
		name: explicit ?? (composed || "—"),
		email: trimmed(str(row, "email")),
		cinemaId,
		cinemaName,
		role: trimmed(str(row, "role")) ?? "",
		profileComplete: boolOrNull(row.profileComplete),
		billingStatus: trimmed(str(row, "billingStatus")) ?? trimmed(str(row, "invoiceStatus")),
	};
}

export function parsePlatformAdmins(body: unknown): PlatformAdminsPage | null {
	if (Array.isArray(body)) {
		const items = keepParsed(body, parseAdmin);
		if (!items) return null;
		return { items, nextCursor: null };
	}
	const row = record(body);
	if (!row) return null;
	const list = Array.isArray(row.items) ? row.items : Array.isArray(row.admins) ? row.admins : null;
	if (!list) return null;
	const items = keepParsed(list, parseAdmin);
	if (!items) return null;
	const cursor = str(row, "nextCursor");
	return { items, nextCursor: cursor?.trim() ? cursor : null };
}

export function parseInvoice(body: unknown): InvoiceListItem | null {
	const row = record(body);
	if (!row) return null;
	const id = str(row, "id");
	const publicNumber = trimmed(str(row, "publicNumber"));
	const cinemaId = str(row, "cinemaId");
	const cinemaName = trimmed(str(row, "cinemaName"));
	const periodYear = intOrNull(row.periodYear);
	const periodMonth = intOrNull(row.periodMonth);
	const amountUzs = intOrNull(row.amountUzs);
	const status = trimmed(str(row, "status"));
	const dueAt = str(row, "dueAt");
	if (
		!id ||
		!publicNumber ||
		!cinemaId ||
		!cinemaName ||
		periodYear === null ||
		periodMonth === null ||
		amountUzs === null ||
		!status ||
		!dueAt
	) {
		return null;
	}
	return {
		id,
		publicNumber,
		cinemaId,
		cinemaName,
		cinemaStatus: trimmed(str(row, "cinemaStatus")) ?? "",
		periodYear,
		periodMonth,
		amountUzs,
		status,
		dueAt,
		paidAt: str(row, "paidAt"),
		daysLate: countOrNull(row.daysLate) ?? 0,
	};
}

export function parseInvoiceList(body: unknown): InvoiceListItem[] | null {
	if (!Array.isArray(body)) return null;
	return keepParsed(body, parseInvoice);
}

function parseDossierAdmin(body: unknown): CinemaDossier["admins"][number] | null {
	const row = record(body);
	if (!row) return null;
	const staffId = str(row, "staffId");
	if (!staffId) return null;
	return {
		staffId,
		role: trimmed(str(row, "role")) ?? "",
		email: trimmed(str(row, "email")),
		firstName: trimmed(str(row, "firstName")),
		lastName: trimmed(str(row, "lastName")),
	};
}

function parseDossierInvoice(body: unknown): InvoiceListItem | null {
	const row = record(body);
	if (!row) return null;
	return parseInvoice({
		...row,
		cinemaId: str(row, "cinemaId") ?? "dossier",
		cinemaName: str(row, "cinemaName") ?? "—",
	});
}

export function parseCinemaDossier(body: unknown): CinemaDossier | null {
	const row = record(body);
	if (
		!row ||
		typeof row.id !== "string" ||
		!trimmed(str(row, "name")) ||
		!isCinemaStatus(row.status)
	) {
		return null;
	}
	const billing = record(row.billing);
	const stats = record(row.stats);
	if (!billing || !stats) return null;
	const monthlyPlanUzs = countOrNull(billing.monthlyPlanUzs);
	const commissionPerTicketUzs = countOrNull(billing.commissionPerTicketUzs);
	const lockAfterDays = countOrNull(billing.lockAfterDays);
	if (monthlyPlanUzs === null || commissionPerTicketUzs === null || lockAfterDays === null)
		return null;
	const admins = Array.isArray(row.admins) ? keepParsed(row.admins, parseDossierAdmin) : [];
	const invoices = Array.isArray(row.invoices) ? keepParsed(row.invoices, parseDossierInvoice) : [];
	if (!admins || !invoices) return null;
	const current = record(row.currentInvoice);
	const currentInvoice =
		current &&
		str(current, "id") &&
		trimmed(str(current, "publicNumber")) &&
		trimmed(str(current, "status"))
			? {
					id: str(current, "id") as string,
					publicNumber: trimmed(str(current, "publicNumber")) as string,
					status: trimmed(str(current, "status")) as string,
					amountUzs: countOrNull(current.amountUzs) ?? 0,
					daysLate: countOrNull(current.daysLate) ?? 0,
				}
			: null;
	return {
		id: row.id,
		name: trimmed(str(row, "name")) as string,
		address: trimmed(str(row, "address")),
		phone: trimmed(str(row, "phone")),
		description: trimmed(str(row, "description")),
		timezone: trimmed(str(row, "timezone")) ?? "Asia/Tashkent",
		status: row.status,
		billing: {
			monthlyPlanUzs,
			commissionPerTicketUzs,
			commissionIsOverride: billing.commissionIsOverride === true,
			defaultCommissionUzs: countOrNull(billing.defaultCommissionUzs) ?? 0,
			lockAfterDays,
		},
		admins,
		invoices,
		currentInvoice,
		stats: {
			halls: countOrNull(stats.halls) ?? 0,
			ordersToday: countOrNull(stats.ordersToday) ?? 0,
			ordersTotal: countOrNull(stats.ordersTotal) ?? 0,
			activeSessions: countOrNull(stats.activeSessions) ?? 0,
			paidInvoices: countOrNull(stats.paidInvoices) ?? 0,
			openInvoices: countOrNull(stats.openInvoices) ?? 0,
		},
	};
}

export function parseProfileBanner(body: unknown): ProfileBanner | null {
	const row = record(body);
	const completion = row ? record(row.profileCompletion) : null;
	if (!completion || typeof completion.profileComplete !== "boolean") return null;
	const missing = Array.isArray(completion.missing)
		? completion.missing.filter((step): step is string => typeof step === "string")
		: [];
	return { profileComplete: completion.profileComplete, missing };
}
