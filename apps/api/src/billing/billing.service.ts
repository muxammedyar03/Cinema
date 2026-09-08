import type { SessionUser } from "@cinema/types";
import type { CinemaBillingInput, PlatformSettingsInput } from "@cinema/validation";
import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { InvoiceStatus, Prisma } from "@prisma/client";
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

function currentHourTashkent(): number {
	return Number(
		new Intl.DateTimeFormat("en-GB", {
			timeZone: TZ,
			hour: "numeric",
			hour12: false,
		}).format(new Date()),
	);
}

function periodOf(date = new Date()) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
	}).formatToParts(date);
	const year = Number(parts.find((p) => p.type === "year")?.value);
	const month = Number(parts.find((p) => p.type === "month")?.value);
	return { year, month };
}

function dueAtForPeriod(year: number, month: number): Date {
	const mm = String(month).padStart(2, "0");
	return new Date(`${year}-${mm}-01T00:00:00+05:00`);
}

function invoicePublicNumber(year: number, month: number, cinemaId: string) {
	const short = cinemaId.slice(-4).toUpperCase();
	return `INV-${year}${String(month).padStart(2, "0")}-${short}`;
}

@Injectable()
export class BillingService {
	private readonly log = new Logger(BillingService.name);

	constructor(private readonly prisma: PrismaService) {}

	async ensureDefaults() {
		await this.prisma.platformSettings.upsert({
			where: { id: "default" },
			update: {},
			create: { id: "default" },
		});
	}

	async getSettings() {
		await this.ensureDefaults();
		return this.prisma.platformSettings.findUniqueOrThrow({ where: { id: "default" } });
	}

	async updateSettings(input: PlatformSettingsInput) {
		await this.ensureDefaults();
		return this.prisma.platformSettings.update({
			where: { id: "default" },
			data: input,
		});
	}

	async upsertCinemaBilling(cinemaId: string, input: CinemaBillingInput) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id: cinemaId } });
		if (!cinema) throw new NotFoundException("Cinema not found");
		return this.prisma.cinemaBilling.upsert({
			where: { cinemaId },
			create: {
				cinemaId,
				monthlyPlanUzs: input.monthlyPlanUzs,
				commissionPerTicketUzs: input.commissionPerTicketUzs ?? null,
			},
			update: {
				monthlyPlanUzs: input.monthlyPlanUzs,
				commissionPerTicketUzs:
					input.commissionPerTicketUzs === undefined ? undefined : input.commissionPerTicketUzs,
			},
		});
	}

	async ensurePeriodInvoices() {
		const settings = await this.getSettings();
		const { year, month } = periodOf();
		const cinemas = await this.prisma.cinema.findMany({
			include: { billing: true },
		});
		for (const cinema of cinemas) {
			const plan = cinema.billing?.monthlyPlanUzs ?? 2_500_000;
			if (!cinema.billing) {
				await this.prisma.cinemaBilling.create({
					data: { cinemaId: cinema.id, monthlyPlanUzs: plan },
				});
			}
			await this.prisma.subscriptionInvoice.upsert({
				where: {
					cinemaId_periodYear_periodMonth: {
						cinemaId: cinema.id,
						periodYear: year,
						periodMonth: month,
					},
				},
				create: {
					cinemaId: cinema.id,
					periodYear: year,
					periodMonth: month,
					amountUzs: plan,
					status: "DUE",
					dueAt: dueAtForPeriod(year, month),
					publicNumber: invoicePublicNumber(year, month, cinema.id),
				},
				update: {},
			});
		}
		return { year, month, lockAfterDays: settings.lockAfterDays };
	}

	daysLate(invoice: { status: InvoiceStatus; dueAt: Date; paidAt: Date | null }): number {
		if (invoice.status === "PAID" || invoice.status === "VOID") return 0;
		return daysBetween(invoice.dueAt, new Date());
	}

	async overview() {
		await this.ensurePeriodInvoices();
		const settings = await this.getSettings();
		const { year, month } = periodOf();
		const now = new Date();

		const cinemas = await this.prisma.cinema.findMany({
			orderBy: { name: "asc" },
			include: {
				billing: true,
				invoices: {
					where: { periodYear: year, periodMonth: month },
					take: 1,
				},
				staff: {
					where: { role: "CINEMA_ADMIN" },
					include: { user: { select: { email: true } } },
					take: 3,
				},
			},
		});

		const startToday = new Date(`${dayKey(now)}T00:00:00+05:00`);
		const tomorrow = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

		const rows = await Promise.all(
			cinemas.map(async (c) => {
				const invoice = c.invoices[0] ?? null;
				const late = invoice ? this.daysLate(invoice) : 0;
				const [ordersToday, activeSessions] = await Promise.all([
					this.prisma.order.count({
						where: {
							cinemaId: c.id,
							createdAt: { gte: startToday, lt: tomorrow },
						},
					}),
					this.prisma.session.count({
						where: {
							cinemaId: c.id,
							status: "PUBLISHED",
							startsAt: { gte: now },
						},
					}),
				]);
				const commission = c.billing?.commissionPerTicketUzs ?? settings.defaultCommissionUzs;
				return {
					cinemaId: c.id,
					name: c.name,
					status: c.status,
					timezone: c.timezone,
					monthlyPlanUzs: c.billing?.monthlyPlanUzs ?? 2_500_000,
					commissionPerTicketUzs: commission,
					ordersToday,
					activeSessions,
					admins: c.staff.map((s) => s.user.email).filter(Boolean),
					invoice: invoice
						? {
								id: invoice.id,
								publicNumber: invoice.publicNumber,
								status: invoice.status,
								amountUzs: invoice.amountUzs,
								dueAt: invoice.dueAt,
								paidAt: invoice.paidAt,
								daysLate: late,
								periodYear: invoice.periodYear,
								periodMonth: invoice.periodMonth,
							}
						: null,
				};
			}),
		);

		return {
			settings: {
				defaultCommissionUzs: settings.defaultCommissionUzs,
				lockAfterDays: settings.lockAfterDays,
				notifyHourTashkent: settings.notifyHourTashkent,
				notifyTelegram: settings.notifyTelegram,
				notifyApp: settings.notifyApp,
				lateMessageTemplate: settings.lateMessageTemplate,
			},
			period: { year, month },
			clients: rows,
			summary: {
				clients: rows.length,
				paid: rows.filter((r) => r.invoice?.status === "PAID").length,
				late: rows.filter((r) => (r.invoice?.daysLate ?? 0) > 0 && r.status !== "LOCKED").length,
				locked: rows.filter((r) => r.status === "LOCKED").length,
			},
		};
	}

	async listInvoices() {
		await this.ensurePeriodInvoices();
		const invoices = await this.prisma.subscriptionInvoice.findMany({
			orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { dueAt: "desc" }],
			include: { cinema: { select: { id: true, name: true, status: true } } },
			take: 100,
		});
		return invoices.map((inv) => ({
			id: inv.id,
			publicNumber: inv.publicNumber,
			cinemaId: inv.cinemaId,
			cinemaName: inv.cinema.name,
			cinemaStatus: inv.cinema.status,
			periodYear: inv.periodYear,
			periodMonth: inv.periodMonth,
			amountUzs: inv.amountUzs,
			status: inv.status,
			dueAt: inv.dueAt,
			paidAt: inv.paidAt,
			daysLate: this.daysLate(inv),
		}));
	}

	async markPaid(invoiceId: string) {
		const invoice = await this.prisma.subscriptionInvoice.findUnique({
			where: { id: invoiceId },
			include: { cinema: true },
		});
		if (!invoice) throw new NotFoundException("Invoice not found");

		const updated = await this.prisma.$transaction(async (tx) => {
			const inv = await tx.subscriptionInvoice.update({
				where: { id: invoiceId },
				data: { status: "PAID", paidAt: new Date(), lockedAt: null },
			});
			if (invoice.cinema.status === "LOCKED") {
				await tx.cinema.update({
					where: { id: invoice.cinemaId },
					data: { status: "ACTIVE" },
				});
			}
			return inv;
		});
		return updated;
	}

	async unlockCinema(cinemaId: string) {
		const cinema = await this.prisma.cinema.findUnique({ where: { id: cinemaId } });
		if (!cinema) throw new NotFoundException("Cinema not found");
		return this.prisma.cinema.update({
			where: { id: cinemaId },
			data: { status: "ACTIVE" },
		});
	}

	async myAccess(user: SessionUser) {
		if (user.role === "SUPER_ADMIN") {
			return { locked: false as const, role: "super" as const };
		}
		const cinemaIds = user.staff.map((s) => s.cinemaId);
		if (cinemaIds.length === 0) {
			throw new ForbiddenException("No cinema access");
		}
		await this.ensurePeriodInvoices();
		const settings = await this.getSettings();
		const cinemas = await this.prisma.cinema.findMany({
			where: { id: { in: cinemaIds } },
			include: {
				billing: true,
				invoices: { orderBy: { dueAt: "desc" }, take: 1 },
			},
		});

		const locked = cinemas.filter((c) => c.status === "LOCKED");
		if (locked.length === 0) {
			return { locked: false as const, role: "cinema" as const };
		}

		const primary = locked[0];
		const invoice = primary.invoices[0] ?? null;
		return {
			locked: true as const,
			role: "cinema" as const,
			cinemaId: primary.id,
			cinemaName: primary.name,
			lockAfterDays: settings.lockAfterDays,
			invoice: invoice
				? {
						id: invoice.id,
						publicNumber: invoice.publicNumber,
						amountUzs: invoice.amountUzs,
						dueAt: invoice.dueAt,
						status: invoice.status,
						daysLate: this.daysLate(invoice),
					}
				: null,
		};
	}

	/** Daily tick: mark overdue, notify, auto-lock */
	async runDailyMaintenance() {
		await this.ensurePeriodInvoices();
		const settings = await this.getSettings();
		const now = new Date();
		const today = dayKey(now);
		const hour = currentHourTashkent();

		const open = await this.prisma.subscriptionInvoice.findMany({
			where: { status: { in: ["DUE", "OVERDUE"] } },
			include: {
				cinema: {
					include: {
						staff: {
							where: { role: "CINEMA_ADMIN" },
							include: { user: true },
						},
					},
				},
			},
		});

		let notified = 0;
		let locked = 0;
		let markedOverdue = 0;

		for (const inv of open) {
			const late = this.daysLate(inv);
			if (late <= 0) continue;

			if (inv.status === "DUE") {
				await this.prisma.subscriptionInvoice.update({
					where: { id: inv.id },
					data: { status: "OVERDUE" },
				});
				markedOverdue += 1;
			}

			const already = inv.lastLateNotifiedOn && dayKey(inv.lastLateNotifiedOn) === today;
			if (!already && hour >= settings.notifyHourTashkent) {
				const left = Math.max(0, settings.lockAfterDays - late);
				const text = settings.lateMessageTemplate
					.replaceAll("{{days}}", String(late))
					.replaceAll("{{invoice}}", inv.publicNumber)
					.replaceAll("{{left}}", String(left));

				for (const staff of inv.cinema.staff) {
					const channels: string[] = [];
					if (settings.notifyApp) channels.push("APP");
					if (settings.notifyTelegram) channels.push("TELEGRAM");
					for (const channel of channels) {
						await this.prisma.notification.create({
							data: {
								userId: staff.userId,
								channel,
								type: "BILLING_LATE",
								payload: {
									text,
									invoiceId: inv.id,
									cinemaId: inv.cinemaId,
									daysLate: late,
								} as Prisma.InputJsonValue,
								status: "QUEUED",
							},
						});
						notified += 1;
					}
					this.log.log(
						`Billing late notify ${channels.join("+") || "none"} → ${staff.user.email ?? staff.userId}: ${text}`,
					);
				}
				await this.prisma.subscriptionInvoice.update({
					where: { id: inv.id },
					data: { lastLateNotifiedOn: now },
				});
			}

			if (late >= settings.lockAfterDays && inv.cinema.status !== "LOCKED") {
				await this.prisma.$transaction([
					this.prisma.cinema.update({
						where: { id: inv.cinemaId },
						data: { status: "LOCKED" },
					}),
					this.prisma.subscriptionInvoice.update({
						where: { id: inv.id },
						data: { lockedAt: now, status: "OVERDUE" },
					}),
				]);
				locked += 1;
				this.log.warn(`Auto-locked cinema ${inv.cinema.name} (${late} days late)`);
			}
		}

		return { notified, locked, markedOverdue };
	}
}
