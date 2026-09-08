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
