import type { SessionUser } from "@cinema/types";
import type {
	CreateCinemaInput,
	CreateClientInput,
	UpdateCinemaInput,
	UpdateClientInput,
} from "@cinema/validation";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import { canAccessCinema } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

const TZ = "Asia/Tashkent";

function dayKey(date: Date): string {
	return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

function daysBetween(from: Date, to: Date): number {
	const a = Date.parse(`${dayKey(from)}T00:00:00+05:00`);
	const b = Date.parse(`${dayKey(to)}T00:00:00+05:00`);
	return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)));
}

@Injectable()
export class CinemaService {
	constructor(private readonly prisma: PrismaService) {}

	list(user: SessionUser) {
		if (user.role === "SUPER_ADMIN") {
			return this.prisma.cinema.findMany({
				orderBy: { name: "asc" },
				include: {
					billing: true,
					_count: { select: { halls: true, staff: true } },
					invoices: {
						orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
						take: 1,
					},
				},
			});
		}
		const ids = user.staff.map((s) => s.cinemaId);
		return this.prisma.cinema.findMany({
			where: { id: { in: ids } },
			orderBy: { name: "asc" },
			include: { _count: { select: { halls: true } } },
		});
	}

	async get(user: SessionUser, id: string) {
		if (!canAccessCinema(user, id)) {
			throw new ForbiddenException("Cinema out of scope");
		}
		const cinema = await this.prisma.cinema.findUnique({
			where: { id },
			include: { halls: { orderBy: { name: "asc" } } },
		});
		if (!cinema) {
			throw new NotFoundException("Cinema not found");
		}
		return cinema;
	}

	/** Super Admin dossier: billing, admins, invoices, aggregate stats — no buyer PII */
	async getClientDossier(id: string) {
		const settings = await this.prisma.platformSettings.upsert({
			where: { id: "default" },
			update: {},
			create: { id: "default" },
		});

		const cinema = await this.prisma.cinema.findUnique({
			where: { id },
			include: {
				billing: true,
				staff: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								firstName: true,
								lastName: true,
								createdAt: true,
							},
						},
					},
					orderBy: { createdAt: "asc" },
				},
				invoices: {
					orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
				},
				_count: { select: { halls: true, sessions: true, orders: true } },
			},
		});
		if (!cinema) throw new NotFoundException("Client not found");

		const now = new Date();
		const startToday = new Date(`${dayKey(now)}T00:00:00+05:00`);
		const tomorrow = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

		const [ordersToday, activeSessions, ticketsActive, paidInvoiceCount, overdueInvoiceCount] =
			await Promise.all([
				this.prisma.order.count({
					where: { cinemaId: id, createdAt: { gte: startToday, lt: tomorrow } },
				}),
				this.prisma.session.count({
					where: { cinemaId: id, status: "PUBLISHED", startsAt: { gte: now } },
				}),
				this.prisma.ticket.count({
					where: { status: "ACTIVE", session: { cinemaId: id } },
				}),
				this.prisma.subscriptionInvoice.count({
					where: { cinemaId: id, status: "PAID" },
				}),
				this.prisma.subscriptionInvoice.count({
					where: { cinemaId: id, status: { in: ["DUE", "OVERDUE"] } },
				}),
			]);

		const monthlyPlanUzs = cinema.billing?.monthlyPlanUzs ?? 2_500_000;
		const commissionPerTicketUzs =
			cinema.billing?.commissionPerTicketUzs ?? settings.defaultCommissionUzs;

		const invoices = cinema.invoices.map((inv) => ({
			id: inv.id,
			publicNumber: inv.publicNumber,
			periodYear: inv.periodYear,
			periodMonth: inv.periodMonth,
			amountUzs: inv.amountUzs,
			status: inv.status,
			dueAt: inv.dueAt,
			paidAt: inv.paidAt,
			daysLate: inv.status === "PAID" || inv.status === "VOID" ? 0 : daysBetween(inv.dueAt, now),
		}));

		const current = invoices[0] ?? null;

		return {
			id: cinema.id,
			name: cinema.name,
			address: cinema.address,
			phone: cinema.phone,
			description: cinema.description,
			timezone: cinema.timezone,
			status: cinema.status,
			createdAt: cinema.createdAt,
			updatedAt: cinema.updatedAt,
			billing: {
				monthlyPlanUzs,
				commissionPerTicketUzs,
				commissionIsOverride: cinema.billing?.commissionPerTicketUzs != null,
				defaultCommissionUzs: settings.defaultCommissionUzs,
				lockAfterDays: settings.lockAfterDays,
			},
			admins: cinema.staff.map((s) => ({
				staffId: s.id,
				role: s.role,
				userId: s.user.id,
				email: s.user.email,
				firstName: s.user.firstName,
				lastName: s.user.lastName,
				createdAt: s.user.createdAt,
			})),
			invoices,
			currentInvoice: current,
			stats: {
				halls: cinema._count.halls,
				sessions: cinema._count.sessions,
				ordersTotal: cinema._count.orders,
				ordersToday,
				activeSessions,
				ticketsActive,
				paidInvoices: paidInvoiceCount,
				openInvoices: overdueInvoiceCount,
			},
		};
	}

	create(data: CreateCinemaInput) {
		return this.prisma.cinema.create({
			data: {
				...data,
				phones: data.phone ? [data.phone] : [],
				billing: {
					create: { monthlyPlanUzs: 2_500_000 },
				},
			},
			include: { billing: true },
		});
	}

	async createClient(data: CreateClientInput) {
		const email = data.admin.email.toLowerCase();
		const existing = await this.prisma.user.findUnique({ where: { email } });
		if (existing) {
			throw new ConflictException("Admin email already registered");
		}

		const passwordHash = await hash(data.admin.password, 10);
		const now = new Date();
		const year = Number(
			new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(now),
		);
		const month = Number(
			new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(now),
		);
		const dueAt = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:00`);

		return this.prisma.$transaction(async (tx) => {
			const cinema = await tx.cinema.create({
				data: {
					name: data.name,
					address: data.address,
					phone: data.phone,
					phones: data.phone ? [data.phone] : [],
					description: data.description,
					timezone: data.timezone,
					billing: {
						create: {
							monthlyPlanUzs: data.monthlyPlanUzs,
							commissionPerTicketUzs: data.commissionPerTicketUzs ?? null,
						},
					},
				},
			});

			const admin = await tx.user.create({
				data: {
					email,
					passwordHash,
					firstName: data.admin.firstName,
					lastName: data.admin.lastName,
					role: "CUSTOMER",
				},
			});

			await tx.cinemaStaff.create({
				data: {
					cinemaId: cinema.id,
					userId: admin.id,
					role: "CINEMA_ADMIN",
				},
			});

			await tx.subscriptionInvoice.create({
				data: {
					cinemaId: cinema.id,
					periodYear: year,
					periodMonth: month,
					amountUzs: data.monthlyPlanUzs,
					status: "DUE",
					dueAt,
					publicNumber: `INV-${year}${String(month).padStart(2, "0")}-${cinema.id.slice(-4).toUpperCase()}`,
				},
			});

			return { id: cinema.id, name: cinema.name, adminEmail: email };
		});
	}

	async update(id: string, data: UpdateCinemaInput) {
		await this.ensureExists(id);
		return this.prisma.cinema.update({ where: { id }, data });
	}

	async updateClient(id: string, data: UpdateClientInput) {
		await this.ensureExists(id);
		const { monthlyPlanUzs, commissionPerTicketUzs, name, address, phone, description, timezone } =
			data;

		return this.prisma.$transaction(async (tx) => {
			const cinema = await tx.cinema.update({
				where: { id },
				data: {
					...(name !== undefined ? { name } : {}),
					...(address !== undefined ? { address } : {}),
					...(phone !== undefined ? { phone } : {}),
					...(description !== undefined ? { description } : {}),
					...(timezone !== undefined ? { timezone } : {}),
				},
			});

			if (monthlyPlanUzs !== undefined || commissionPerTicketUzs !== undefined) {
				await tx.cinemaBilling.upsert({
					where: { cinemaId: id },
					create: {
						cinemaId: id,
						monthlyPlanUzs: monthlyPlanUzs ?? 2_500_000,
						commissionPerTicketUzs: commissionPerTicketUzs ?? null,
					},
					update: {
						...(monthlyPlanUzs !== undefined ? { monthlyPlanUzs } : {}),
						...(commissionPerTicketUzs !== undefined ? { commissionPerTicketUzs } : {}),
					},
				});
			}

			return cinema;
		});
	}

	async setStatus(id: string, status: "ACTIVE" | "DISABLED" | "LOCKED") {
		await this.ensureExists(id);
		return this.prisma.cinema.update({ where: { id }, data: { status } });
	}

	async remove(id: string) {
		await this.ensureExists(id);
		const orders = await this.prisma.order.count({ where: { cinemaId: id } });
		if (orders > 0) {
			throw new BadRequestException(
				"Нельзя удалить клиента с заказами. Заблокируйте доступ (DISABLED).",
			);
		}

		await this.prisma.$transaction(async (tx) => {
			const sessions = await tx.session.findMany({
				where: { cinemaId: id },
				select: { id: true },
			});
			const sessionIds = sessions.map((s) => s.id);
			if (sessionIds.length) {
				await tx.ticket.deleteMany({ where: { sessionId: { in: sessionIds } } });
				await tx.sessionSeat.deleteMany({ where: { sessionId: { in: sessionIds } } });
				await tx.sessionPricing.deleteMany({ where: { sessionId: { in: sessionIds } } });
				await tx.session.deleteMany({ where: { cinemaId: id } });
			}

			const halls = await tx.hall.findMany({
				where: { cinemaId: id },
				select: { id: true },
			});
			const hallIds = halls.map((h) => h.id);
			if (hallIds.length) {
				await tx.seat.deleteMany({ where: { hallId: { in: hallIds } } });
				await tx.hallLayout.deleteMany({ where: { hallId: { in: hallIds } } });
				await tx.hall.deleteMany({ where: { cinemaId: id } });
			}

			await tx.movie.deleteMany({ where: { cinemaId: id } });
			await tx.subscriptionInvoice.deleteMany({ where: { cinemaId: id } });
			await tx.cinemaBilling.deleteMany({ where: { cinemaId: id } });
			await tx.cinemaStaff.deleteMany({ where: { cinemaId: id } });
			await tx.cinema.delete({ where: { id } });
		});

		return { ok: true as const };
	}

	private async ensureExists(id: string) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id } });
		if (!cinema) {
			throw new NotFoundException("Cinema not found");
		}
	}
}
