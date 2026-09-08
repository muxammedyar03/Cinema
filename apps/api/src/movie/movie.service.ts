import type { SessionUser } from "@cinema/types";
import type { CreateMovieInput, UpdateMovieInput } from "@cinema/validation";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import type { Movie } from "@prisma/client";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MovieService {
	constructor(private readonly prisma: PrismaService) {}

	private serialize(movie: Movie) {
		return {
			...movie,
			rating: movie.rating === null ? null : Number(movie.rating),
		};
	}

	private cinemaIdsOf(user: SessionUser): string[] | null {
		if (user.role === "SUPER_ADMIN") return null;
		return user.staff.map((s) => s.cinemaId);
	}

	private primaryCinemaId(user: SessionUser): string {
		const id =
			user.staff.find((s) => s.role === "CINEMA_ADMIN")?.cinemaId ?? user.staff[0]?.cinemaId;
		if (!id) throw new ForbiddenException("No cinema access");
		return id;
	}

	async assertCanAccess(user: SessionUser, movieId: string) {
		const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
		if (!movie) throw new NotFoundException("Movie not found");
		if (!canAccessCinema(user, movie.cinemaId)) {
			throw new ForbiddenException("Movie out of scope");
		}
		return movie;
	}

	async list(user: SessionUser) {
		const cinemaIds = this.cinemaIdsOf(user);
		const rows = await this.prisma.movie.findMany({
			where: cinemaIds ? { cinemaId: { in: cinemaIds } } : undefined,
			orderBy: [{ status: "asc" }, { title: "asc" }],
		});
		return rows.map((m) => this.serialize(m));
	}

	async get(user: SessionUser, id: string) {
		const movie = await this.assertCanAccess(user, id);
		return this.serialize(movie);
	}

	async create(user: SessionUser, data: CreateMovieInput) {
		const cinemaId =
			user.role === "SUPER_ADMIN" && data.cinemaId ? data.cinemaId : this.primaryCinemaId(user);
		if (!canManageCinema(user, cinemaId)) {
			throw new ForbiddenException("Cannot create movie for this cinema");
		}
		return this.prisma.movie
			.create({
				data: {
					cinemaId,
					title: data.title,
					description: data.description || null,
					posterUrl: data.posterUrl || null,
					durationMin: data.durationMin,
					rating: data.rating ?? null,
					ageRating: data.ageRating || null,
					genres: data.genres ?? [],
					audioLanguages: data.audioLanguages ?? [],
					releasedAt: data.releasedAt ?? null,
				},
			})
			.then((m) => this.serialize(m));
	}

	async update(user: SessionUser, id: string, data: UpdateMovieInput) {
		const movie = await this.assertCanAccess(user, id);
		if (!canManageCinema(user, movie.cinemaId)) {
			throw new ForbiddenException("Cannot update this movie");
		}
		return this.prisma.movie
			.update({
				where: { id },
				data: {
					...(data.title !== undefined ? { title: data.title } : {}),
					...(data.description !== undefined ? { description: data.description || null } : {}),
					...(data.posterUrl !== undefined
						? { posterUrl: data.posterUrl === "" ? null : data.posterUrl }
						: {}),
					...(data.durationMin !== undefined ? { durationMin: data.durationMin } : {}),
					...(data.rating !== undefined ? { rating: data.rating } : {}),
					...(data.ageRating !== undefined ? { ageRating: data.ageRating || null } : {}),
					...(data.genres !== undefined ? { genres: data.genres } : {}),
					...(data.audioLanguages !== undefined ? { audioLanguages: data.audioLanguages } : {}),
					...(data.releasedAt !== undefined ? { releasedAt: data.releasedAt } : {}),
					...(data.status !== undefined ? { status: data.status } : {}),
				},
			})
			.then((m) => this.serialize(m));
	}

	async archive(user: SessionUser, id: string) {
		return this.update(user, id, { status: "ARCHIVED" });
	}

	async restore(user: SessionUser, id: string) {
		return this.update(user, id, { status: "ACTIVE" });
	}

	async remove(user: SessionUser, id: string) {
		const movie = await this.assertCanAccess(user, id);
		if (!canManageCinema(user, movie.cinemaId)) {
			throw new ForbiddenException("Cannot delete this movie");
		}
		const sessions = await this.prisma.session.count({ where: { movieId: id } });
		if (sessions > 0) {
			throw new ConflictException("Нельзя удалить: есть сеансы. Сначала архивируйте фильм.");
		}
		try {
			await this.prisma.movie.delete({ where: { id } });
		} catch {
			throw new BadRequestException("Не удалось удалить фильм");
		}
		return { ok: true };
	}
}
