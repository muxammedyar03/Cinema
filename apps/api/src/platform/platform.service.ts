import type { PlatformListQuery } from "@cinema/validation";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { pageById, toPlatformAdmin, toPlatformCinema } from "./platform.map";

const DEFAULT_LIMIT = 50;

const latestInvoice = {
	orderBy: [{ periodYear: "desc" as const }, { periodMonth: "desc" as const }],
	take: 1,
	select: { status: true },
};

@Injectable()
export class PlatformService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Read-only counts for apps/admin `parsePlatformSummary`.
	 * Does not create billing rows. `invoicesUnpaid` is 0 when none exist.
	 */
	async summary() {
		const [cinemas, cinemasActive, halls, cinemaAdmins, invoicesUnpaid] = await Promise.all([
			this.prisma.cinema.count(),
			this.prisma.cinema.count({ where: { status: "ACTIVE" } }),
			this.prisma.hall.count(),
			this.prisma.cinemaStaff.count({ where: { role: "CINEMA_ADMIN", active: true } }),
			this.prisma.subscriptionInvoice.count({
				where: { status: { in: ["DUE", "OVERDUE"] } },
			}),
		]);
		return {
			cinemas,
			cinemasActive,
			halls,
			cinemaAdmins,
			invoicesUnpaid,
		};
	}

	async listAdmins(query: PlatformListQuery) {
		const limit = query.limit ?? DEFAULT_LIMIT;
		const rows = await this.prisma.cinemaStaff.findMany({
			where: query.cursor ? { id: { gt: query.cursor } } : undefined,
			orderBy: { id: "asc" },
			take: limit + 1,
			select: {
				id: true,
				role: true,
				active: true,
				user: {
					select: {
						id: true,
						email: true,
						login: true,
						firstName: true,
						lastName: true,
					},
				},
				cinema: {
					select: {
						id: true,
						name: true,
						city: true,
						status: true,
						profileComplete: true,
						invoices: latestInvoice,
					},
				},
			},
		});
		return pageById(rows, limit, toPlatformAdmin);
	}

	async listCinemas(query: PlatformListQuery) {
		const limit = query.limit ?? DEFAULT_LIMIT;
		const rows = await this.prisma.cinema.findMany({
			where: query.cursor ? { id: { gt: query.cursor } } : undefined,
			orderBy: { id: "asc" },
			take: limit + 1,
			select: {
				id: true,
				name: true,
				city: true,
				status: true,
				profileComplete: true,
				_count: {
					select: {
						halls: true,
						staff: { where: { role: "CINEMA_ADMIN", active: true } },
					},
				},
				invoices: latestInvoice,
			},
		});
		return pageById(rows, limit, toPlatformCinema);
	}
}
