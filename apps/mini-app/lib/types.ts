/** KAN-37: who chose the afisha banner. Optional until that API lands. */
export type FeaturedSource = "manual" | "nearest";

export type PublicCinema = {
	id: string;
	name: string;
	address: string | null;
	city?: string | null;
	logoUrl?: string | null;
	hasMap?: boolean;
	profileComplete?: boolean;
};

export type CinemaPhoto = {
	id: string;
	url: string;
	sortOrder: number;
	/** KAN-37 / design-v2-gaps: hidden when absent. */
	caption?: string | null;
};

export type CinemaMap = {
	provider: "google" | "yandex";
	lat: number;
	lng: number;
	address: string;
	embedHint?: "google-maps" | "yandex-maps";
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
	photos: CinemaPhoto[];
	map: CinemaMap | null;
	timezone: string;
	followerCount: number;
	followedByMe: boolean;
	/** Optional until Cinema.city / Cinema.tagline land. */
	city?: string | null;
	tagline?: string | null;
};

export type CatalogSession = {
	id: string;
	startsAt: string;
	cinemaId: string;
	cinemaName: string;
	hallName: string;
	basePriceUzs: number;
	capacity: number;
	remaining: number;
	bookingMode?: "SEATED" | "GENERAL_ADMISSION";
	/** KAN-37: session language, optional. Hidden when absent. */
	audioLanguage?: string | null;
};

export type CatalogMovie = {
	id: string;
	title: string;
	posterUrl: string | null;
	durationMin: number;
	ageRating: string | null;
	sessions: CatalogSession[];
	/** Optional until the catalog starts returning them. Hidden when empty. */
	rating?: number | null;
	genres?: string[] | null;
	minPriceUzs?: number | null;
	/** KAN-37. Optional so the UI works before and after the backend lands. */
	isFeatured?: boolean;
	featuredSource?: FeaturedSource | null;
};

export type CatalogDay = {
	date: string;
	movies: CatalogMovie[];
};

export type CatalogResponse = {
	from: string;
	to: string;
	days: CatalogDay[];
	/** Optional server-side featured pick (KAN-37). */
	featuredMovieId?: string | null;
	featuredSource?: FeaturedSource | null;
};

export type MovieDetail = {
	id: string;
	title: string;
	description: string | null;
	posterUrl: string | null;
	durationMin: number;
	rating: number | null;
	ageRating: string | null;
	genres: string[];
	audioLanguages: string[];
	releasedAt: string | null;
	cinema: { id: string; name: string } | null;
	sessions: CatalogSession[];
};

export type SessionSeat = {
	id: string;
	rowLabel: string;
	number: number;
	type: "STANDARD" | "VIP" | "BLOCKED";
	x: number;
	y: number;
	rotation: number;
	status: "AVAILABLE" | "HELD" | "SOLD" | "BLOCKED";
	priceUzs: number;
};

export type SessionDetail = {
	id: string;
	startsAt: string;
	basePriceUzs: number;
	discountPercent: number;
	remaining: number;
	bookingMode?: "SEATED" | "GENERAL_ADMISSION";
	movie: {
		id: string;
		title: string;
		posterUrl: string | null;
		durationMin: number;
		ageRating: string | null;
	};
	cinema: { id: string; name: string };
	hall: { id: string; name: string; capacity: number };
	seats: SessionSeat[];
	audioLanguage?: string | null;
};

export type OrderStatus =
	| "PENDING_PAYMENT"
	| "PAID"
	| "EXPIRED"
	| "CANCELLED"
	| "REFUND_PENDING"
	| "REFUNDED";

export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED" | "REFUNDED";

export type OrderTicket = {
	id: string;
	code: string;
	status: TicketStatus | string;
	type?: "SEAT" | "GENERAL_ADMISSION" | string;
	seatLabel?: string | null;
	usedAt?: string | null;
	unitPriceUzs?: number;
};

export type OrderItem = {
	id?: string;
	seatLabel: string | null;
	seatType: string | null;
	unitPriceUzs: number;
	quantity: number;
	type?: string;
};

export type OrderDetail = {
	id: string;
	publicNumber: number;
	status: OrderStatus | string;
	totalUzs: number;
	holdExpiresAt: string | null;
	createdAt?: string;
	cinema: { id?: string; name: string };
	session: {
		id: string;
		startsAt: string;
		movie: { title: string; posterUrl?: string | null };
		hall: { name: string };
	};
	items: OrderItem[];
	tickets?: OrderTicket[];
	payment?: RahmatPayment | null;
};

export type OrderRow = {
	id: string;
	publicNumber: number;
	status: string;
	totalUzs: number;
	holdExpiresAt: string | null;
	cinemaName: string;
	movieTitle: string;
	hallName: string;
	startsAt: string;
	itemCount: number;
};

export type RahmatPayment = {
	otpRequired?: boolean;
	paymentId?: string;
	id?: string;
	orderId: string;
	provider: string;
	status: string;
	amountUzs: number;
	payUrl?: string;
	deeplinkUrl?: string;
	holdExpiresAt?: string;
};

export type RefundResult = {
	refundId: string;
	status: string;
	amountUzs?: number;
};
