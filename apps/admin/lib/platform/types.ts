export type CinemaStatus = "ACTIVE" | "DISABLED" | "LOCKED";

/** `GET /admin/platform/summary` — KAN-37 / design-v2-gaps §2. */
export type PlatformSummary = {
	cinemas: number;
	cinemasActive: number;
	halls: number;
	cinemaAdmins: number;
	invoicesUnpaid: number;
};

/** Row of `GET /admin/cinemas`, plus optional fields KAN-37 adds. */
export type CinemaListItem = {
	id: string;
	name: string;
	status: CinemaStatus;
	city: string | null;
	address: string | null;
	phone: string | null;
	timezone: string;
	profileComplete: boolean | null;
	halls: number | null;
	staffCount: number | null;
	monthlyPlanUzs: number | null;
	billingStatus: string | null;
};

/** `GET /admin/platform/admins` — KAN-37. */
export type PlatformAdmin = {
	userId: string;
	name: string;
	email: string | null;
	cinemaId: string;
	cinemaName: string;
	role: string;
	profileComplete: boolean | null;
	billingStatus: string | null;
};

export type PlatformAdminsPage = {
	items: PlatformAdmin[];
	nextCursor: string | null;
};

export type InvoiceListItem = {
	id: string;
	publicNumber: string;
	cinemaId: string;
	cinemaName: string;
	cinemaStatus: string;
	periodYear: number;
	periodMonth: number;
	amountUzs: number;
	status: string;
	dueAt: string;
	paidAt: string | null;
	daysLate: number;
};

export type CinemaDossier = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	description: string | null;
	timezone: string;
	status: CinemaStatus;
	billing: {
		monthlyPlanUzs: number;
		commissionPerTicketUzs: number;
		commissionIsOverride: boolean;
		defaultCommissionUzs: number;
		lockAfterDays: number;
	};
	admins: Array<{
		staffId: string;
		role: string;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
	}>;
	invoices: InvoiceListItem[];
	currentInvoice: {
		id: string;
		publicNumber: string;
		status: string;
		amountUzs: number;
		daysLate: number;
	} | null;
	stats: {
		halls: number;
		ordersToday: number;
		ordersTotal: number;
		activeSessions: number;
		paidInvoices: number;
		openInvoices: number;
	};
};

export type ProfileBanner = {
	profileComplete: boolean;
	missing: string[];
};

export type LoadState<T> =
	| { status: "ready"; data: T }
	| { status: "unavailable" }
	| { status: "error"; message: string };

export type ApiResult = {
	status: number;
	body: unknown;
};
