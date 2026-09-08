import type { SessionUser } from "@cinema/types";
import type { CreateHallInput, LayoutInput, UpdateHallInput } from "@cinema/validation";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HallService {
	constructor(private readonly prisma: PrismaService) {}

	async list(user: SessionUser, cinemaId: string) {
		if (!canAccessCinema(user, cinemaId)) {
			throw new ForbiddenException("Cinema out of scope");
		}
		await this.ensureCinema(cinemaId);
		return this.prisma.hall.findMany({
			where: { cinemaId },
			orderBy: { name: "asc" },
		});
	}

	async create(user: SessionUser, cinemaId: string, data: CreateHallInput) {
		if (!canManageCinema(user, cinemaId)) {
			throw new ForbiddenException("Only cinema admin can manage halls");
		}
		await this.ensureCinema(cinemaId);
		return this.prisma.hall.create({ data: { ...data, cinemaId } });
	}

	async get(user: SessionUser, cinemaId: string, hallId: string) {
		if (!canAccessCinema(user, cinemaId)) {
			throw new ForbiddenException("Cinema out of scope");
		}
		const hall = await this.prisma.hall.findFirst({
			where: { id: hallId, cinemaId },
		});
		if (!hall) {
			throw new NotFoundException("Hall not found");
		}
		return hall;
	}

	async update(user: SessionUser, cinemaId: string, hallId: string, data: UpdateHallInput) {
		if (!canManageCinema(user, cinemaId)) {
			throw new ForbiddenException("Only cinema admin can manage halls");
		}
		await this.get(user, cinemaId, hallId);
		return this.prisma.hall.update({ where: { id: hallId }, data });
	}

	async remove(user: SessionUser, cinemaId: string, hallId: string) {
		if (!canManageCinema(user, cinemaId)) {
			throw new ForbiddenException("Only cinema admin can manage halls");
		}
		await this.get(user, cinemaId, hallId);
		const sessions = await this.prisma.session.count({ where: { hallId } });
		if (sessions > 0) {
			throw new BadRequestException("Cannot delete hall with existing sessions");
		}
		await this.prisma.$transaction(async (tx) => {
			await tx.seat.deleteMany({ where: { hallId } });
			await tx.hallLayout.deleteMany({ where: { hallId } });
			await tx.hall.delete({ where: { id: hallId } });
		});
		return { ok: true };
	}

	async layout(user: SessionUser, cinemaId: string, hallId: string) {
		await this.get(user, cinemaId, hallId);
		const layout = await this.prisma.hallLayout.findFirst({
			where: { hallId, isActive: true },
			include: { seats: { orderBy: [{ rowLabel: "asc" }, { number: "asc" }] } },
		});
		// Nest serializes `null` as an empty body; return an empty draft instead.
		if (!layout) {
			return {
				id: null,
				version: 0,
				canvasWidth: 1000,
				canvasHeight: 800,
				seats: [] as const,
				isActive: false,
			};
		}
		return layout;
	}

	async saveLayout(user: SessionUser, cinemaId: string, hallId: string, data: LayoutInput) {
		if (!canManageCinema(user, cinemaId))
			throw new ForbiddenException("Only cinema admin can manage halls");
		await this.get(user, cinemaId, hallId);
		return this.prisma.$transaction(async (tx) => {
			// Serialize saves against this hall, keeping every previous layout immutable.
			await tx.$queryRaw`SELECT id FROM "Hall" WHERE id = ${hallId} FOR UPDATE`;
			const hall = await tx.hall.findUniqueOrThrow({ where: { id: hallId } });
			if (data.seats.length > hall.capacity)
				throw new BadRequestException("Seat count exceeds hall capacity");
			const latest = await tx.hallLayout.findFirst({
				where: { hallId },
				orderBy: { version: "desc" },
			});
			if ((latest?.version ?? 0) !== data.expectedVersion)
				throw new ConflictException("Layout changed. Reload before saving.");
			await tx.hallLayout.updateMany({
				where: { hallId, isActive: true },
				data: { isActive: false },
			});
			return tx.hallLayout.create({
				data: {
					hallId,
					version: (latest?.version ?? 0) + 1,
					canvasWidth: data.canvasWidth,
					canvasHeight: data.canvasHeight,
					seats: { create: data.seats.map((seat) => ({ ...seat, hallId })) },
				},
				include: { seats: true },
			});
		});
	}

	private async ensureCinema(id: string) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id } });
		if (!cinema) {
			throw new NotFoundException("Cinema not found");
		}
	}
}
