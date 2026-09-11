export type PublicCinema = {
	id: string;
	name: string;
	address: string | null;
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
};

export type CatalogMovie = {
	id: string;
	title: string;
	posterUrl: string | null;
	durationMin: number;
	ageRating: string | null;
	sessions: CatalogSession[];
};

export type CatalogDay = {
	date: string;
	movies: CatalogMovie[];
};

export type CatalogResponse = {
	from: string;
	to: string;
	days: CatalogDay[];
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
