import type { SessionUser } from "@cinema/types";
import type { CatalogQuery } from "@cinema/validation";
import { Injectable, NotFoundException } from "@nestjs/common";
import { countSessionOccupied, gaQtyBySessionIds } from "../booking/capacity";
import { mapPayload } from "../cinema/profile.util";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

const TZ = "Asia/Tashkent";
const CATALOG_TTL = 45;

function dayKey(date: Date): string {
	return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

function defaultRange(): { from: Date; to: Date } {
	const now = new Date();
	const today = dayKey(now);
	const from = new Date(`${today}T00:00:00+05:00`);
	const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
	return { from, to };
}

@Injectable()
export class PublicService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
	) {}

	cinemas() {
		return this.prisma.cinema
			.findMany({
				where: { status: "ACTIVE" },
				orderBy: { name: "asc" },
				select: {
					id: true,
					name: true,
					address: true,
					logoUrl: true,
					lat: true,
					lng: true,
					profileComplete: true,
				},
			})
			.then((rows) =>
				rows.map((c) => ({
					id: c.id,
					name: c.name,
					address: c.address,
					logoUrl: c.logoUrl,
					hasMap: c.lat != null && c.lng != null,
					profileComplete: c.profileComplete,
				})),
			);
	}

	async cinema(id: string, user?: SessionUser) {
		const cinema = await this.prisma.cinema.findUnique({
			where: { id },
			include: { photos: { orderBy: { sortOrder: "asc" } } },
		});
		if (!cinema || cinema.status !== "ACTIVE") {
			throw new NotFoundException({ code: "CINEMA_NOT_FOUND", message: "Cinema not found" });
		}
		const [followerCount, followed] = await Promise.all([
			this.prisma.cinemaFollow.count({ where: { cinemaId: id } }),
			user
				? this.prisma.cinemaFollow.findUnique({
						where: { userId_cinemaId: { userId: user.id, cinemaId: id } },
					})
				: Promise.resolve(null),
		]);
		const phones = cinema.phones.length ? cinema.phones : cinema.phone ? [cinema.phone] : [];
		return {
			id: cinema.id,
			name: cinema.name,
			address: cinema.address,
			description: cinema.description,
			logoUrl: cinema.logoUrl,
			phones,
			instagramUrl: cinema.instagramUrl,
			telegramContact: cinema.telegramContact,
			photos: cinema.photos.map((p) => ({ id: p.id, url: p.url, sortOrder: p.sortOrder })),
			map: mapPayload({
				mapProvider: cinema.mapProvider,
				lat: cinema.lat,
				lng: cinema.lng,
				address: cinema.address,
			}),
			timezone: cinema.timezone,
			followerCount,
			followedByMe: Boolean(followed),
		};
	}

	async cinemaMap(id: string) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id } });
		if (!cinema || cinema.status !== "ACTIVE") {
			throw new NotFoundException({ code: "CINEMA_NOT_FOUND", message: "Cinema not found" });
		}
		const map = mapPayload({
			mapProvider: cinema.mapProvider,
			lat: cinema.lat,
			lng: cinema.lng,
			address: cinema.address,
		});
		if (!map) {
			throw new NotFoundException({ code: "MAP_NOT_CONFIGURED", message: "Map not configured" });
		}
		return map;
	}

	async catalog(query: CatalogQuery) {
		const { from, to } =
			query.from && query.to ? { from: query.from, to: query.to } : defaultRange();
		const cinemaId = query.cinemaId;
		const cacheKey = `catalog:${from.toISOString()}:${to.toISOString()}:${cinemaId ?? "all"}`;
		const cached = await this.redis.client.get(cacheKey);
		if (cached) return JSON.parse(cached) as unknown;

		const sessions = await this.prisma.session.findMany({
			where: {
				status: "PUBLISHED",
				startsAt: { gte: from, lt: to },
				cinema: { status: "ACTIVE", ...(cinemaId ? { id: cinemaId } : {}) },
				movie: { status: "ACTIVE" },
			},
			orderBy: { startsAt: "asc" },
			include: {
				movie: true,
				cinema: { select: { id: true, name: true } },
				hall: { select: { id: true, name: true, capacity: true } },
				sessionSeats: { select: { status: true } },
			},
		});

		const gaMap = await gaQtyBySessionIds(
			this.prisma,
			sessions.map((s) => s.id),
		);

		const days = new Map<
			string,
			Map<
				string,
				{
					id: string;
					title: string;
					posterUrl: string | null;
					durationMin: number;
					ageRating: string | null;
					sessions: Array<Record<string, unknown>>;
				}
			>
		>();

		for (const session of sessions) {
			const date = dayKey(session.startsAt);
			if (!days.has(date)) days.set(date, new Map());
			const movies = days.get(date);
			if (!movies) continue;
			if (!movies.has(session.movieId)) {
				movies.set(session.movieId, {
					id: session.movie.id,
					title: session.movie.title,
					posterUrl: session.movie.posterUrl,
					durationMin: session.movie.durationMin,
					ageRating: session.movie.ageRating,
					sessions: [],
				});
			}
			const seatOccupied = session.sessionSeats.filter((s) =>
				["HELD", "SOLD", "BLOCKED"].includes(s.status),
			).length;
			const occupied = seatOccupied + (gaMap.get(session.id) ?? 0);
			const isGa = session.sessionSeats.length === 0;
			movies.get(session.movieId)?.sessions.push({
				id: session.id,
				startsAt: session.startsAt,
				cinemaId: session.cinema.id,
				cinemaName: session.cinema.name,
				hallName: session.hall.name,
				basePriceUzs: session.basePriceUzs,
				capacity: session.hall.capacity,
				remaining: Math.max(0, session.hall.capacity - occupied),
				bookingMode: isGa ? "GENERAL_ADMISSION" : "SEATED",
			});
		}

		const payload = {
			from,
			to,
			days: [...days.entries()].map(([date, movies]) => ({
				date,
				movies: [...movies.values()],
			})),
		};
		await this.redis.client.set(cacheKey, JSON.stringify(payload), "EX", CATALOG_TTL);
		return payload;
	}

	async movie(id: string) {
		const movie = await this.prisma.movie.findUnique({
			where: { id },
			include: { cinema: { select: { id: true, name: true, status: true } } },
		});
		if (!movie || movie.status === "ARCHIVED") throw new NotFoundException("Movie not found");
		const sessions = await this.prisma.session.findMany({
			where: { movieId: id, status: "PUBLISHED", cinema: { status: "ACTIVE" } },
			orderBy: { startsAt: "asc" },
			include: {
				cinema: { select: { id: true, name: true } },
				hall: { select: { id: true, name: true, capacity: true } },
				sessionSeats: { select: { status: true } },
			},
		});
		const gaMap = await gaQtyBySessionIds(
			this.prisma,
			sessions.map((s) => s.id),
		);
		const { cinema, rating, ...rest } = movie;
		return {
			...rest,
			cinema: cinema.status === "ACTIVE" ? { id: cinema.id, name: cinema.name } : null,
			rating: rating === null ? null : Number(rating),
			sessions: sessions.map((session) => {
				const seatOccupied = session.sessionSeats.filter((s) =>
					["HELD", "SOLD", "BLOCKED"].includes(s.status),
				).length;
				const occupied = seatOccupied + (gaMap.get(session.id) ?? 0);
				return {
					id: session.id,
					startsAt: session.startsAt,
					cinemaId: session.cinema.id,
					cinemaName: session.cinema.name,
					hallName: session.hall.name,
					basePriceUzs: session.basePriceUzs,
					capacity: session.hall.capacity,
					remaining: Math.max(0, session.hall.capacity - occupied),
					bookingMode: session.sessionSeats.length === 0 ? "GENERAL_ADMISSION" : "SEATED",
				};
			}),
		};
	}

	async session(id: string) {
		const session = await this.prisma.session.findUnique({
			where: { id },
			include: {
				movie: true,
				cinema: { select: { id: true, name: true, status: true } },
				hall: { select: { id: true, name: true, capacity: true } },
				pricing: true,
				sessionSeats: {
					include: {
						seat: {
							select: {
								id: true,
								rowLabel: true,
								number: true,
								type: true,
								x: true,
								y: true,
								rotation: true,
							},
						},
					},
				},
			},
		});
		if (!session || session.status !== "PUBLISHED" || session.cinema.status !== "ACTIVE") {
			throw new NotFoundException("Session not found");
		}
		const occupied = await countSessionOccupied(this.prisma, session.id);
		const isGa = session.sessionSeats.length === 0;
		return {
			id: session.id,
			startsAt: session.startsAt,
			basePriceUzs: session.basePriceUzs,
			discountPercent: session.discountPercent,
			pricing: session.pricing,
			bookingMode: isGa ? ("GENERAL_ADMISSION" as const) : ("SEATED" as const),
			movie: session.movie,
			cinema: { id: session.cinema.id, name: session.cinema.name },
			hall: session.hall,
			remaining: Math.max(0, session.hall.capacity - occupied),
			seats: session.sessionSeats.map((row) => ({
				id: row.seat.id,
				rowLabel: row.seat.rowLabel,
				number: row.seat.number,
				type: row.seat.type,
				x: row.seat.x,
				y: row.seat.y,
				rotation: row.seat.rotation,
				status: row.status,
				priceUzs: row.priceUzs,
			})),
		};
	}
}
