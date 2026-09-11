import type { SessionUser } from "@cinema/types";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FollowService {
	constructor(private readonly prisma: PrismaService) {}

	async follow(user: SessionUser, cinemaId: string) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id: cinemaId } });
		if (!cinema) {
			throw new NotFoundException({ code: "CINEMA_NOT_FOUND", message: "Cinema not found" });
		}
		if (cinema.status !== "ACTIVE") {
			throw new ConflictException({
				code: "CINEMA_NOT_FOLLOWABLE",
				message: "Cinema is not followable",
			});
		}

		const existing = await this.prisma.cinemaFollow.findUnique({
			where: { userId_cinemaId: { userId: user.id, cinemaId } },
		});
		if (existing) {
			return { following: true as const, created: false as const };
		}

		await this.prisma.cinemaFollow.create({
			data: { userId: user.id, cinemaId },
		});
		return { following: true as const, created: true as const };
	}

	async unfollow(user: SessionUser, cinemaId: string) {
		await this.prisma.cinemaFollow.deleteMany({
			where: { userId: user.id, cinemaId },
		});
		return { following: false as const };
	}

	async status(user: SessionUser | undefined, cinemaId: string) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id: cinemaId } });
		if (!cinema) {
			throw new NotFoundException({ code: "CINEMA_NOT_FOUND", message: "Cinema not found" });
		}
		const followerCount = await this.prisma.cinemaFollow.count({ where: { cinemaId } });
		let following = false;
		if (user) {
			const row = await this.prisma.cinemaFollow.findUnique({
				where: { userId_cinemaId: { userId: user.id, cinemaId } },
			});
			following = Boolean(row);
		}
		return { following, followerCount };
	}

	async listMine(user: SessionUser) {
		const rows = await this.prisma.cinemaFollow.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			include: {
				cinema: { select: { id: true, name: true, logoUrl: true } },
			},
		});
		return {
			items: rows.map((r) => ({
				cinemaId: r.cinema.id,
				name: r.cinema.name,
				logoUrl: r.cinema.logoUrl,
				followedAt: r.createdAt.toISOString(),
			})),
		};
	}
}
