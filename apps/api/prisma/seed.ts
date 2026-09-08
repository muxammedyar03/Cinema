import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	const passwordHash = await hash("ChangeMe123!", 10);

	const superAdmin = await prisma.user.upsert({
		where: { email: "super@cinema.local" },
		update: { passwordHash, role: "SUPER_ADMIN" },
		create: {
			email: "super@cinema.local",
			passwordHash,
			firstName: "Super",
			lastName: "Admin",
			role: "SUPER_ADMIN",
		},
	});

	const cinema = await prisma.cinema.upsert({
		where: { id: "seed-magic-cinema" },
		update: { name: "Magic Cinema", status: "ACTIVE" },
		create: {
			id: "seed-magic-cinema",
			name: "Magic Cinema",
			address: "Toshkent",
			timezone: "Asia/Tashkent",
			status: "ACTIVE",
		},
	});

	const cinemaAdmin = await prisma.user.upsert({
		where: { email: "admin@magic.local" },
		update: { passwordHash },
		create: {
			email: "admin@magic.local",
			passwordHash,
			firstName: "Magic",
			lastName: "Admin",
			role: "CUSTOMER",
		},
	});

	await prisma.cinemaStaff.upsert({
		where: { cinemaId_userId: { cinemaId: cinema.id, userId: cinemaAdmin.id } },
		update: { role: "CINEMA_ADMIN" },
		create: {
			cinemaId: cinema.id,
			userId: cinemaAdmin.id,
			role: "CINEMA_ADMIN",
		},
	});

	const existingHall = await prisma.hall.findFirst({
		where: { cinemaId: cinema.id, name: "Hall 1" },
	});
	if (!existingHall) {
		await prisma.hall.create({
			data: { cinemaId: cinema.id, name: "Hall 1", capacity: 120 },
		});
	}

	await prisma.movie.upsert({
		where: { id: "seed-movie-dune" },
		update: {
			cinemaId: cinema.id,
			title: "Dune: Part Two",
			genres: ["Фантастика", "Приключения"],
			audioLanguages: ["ru", "en"],
			rating: 8.5,
			releasedAt: new Date("2024-03-01"),
		},
		create: {
			id: "seed-movie-dune",
			cinemaId: cinema.id,
			title: "Dune: Part Two",
			durationMin: 166,
			ageRating: "12+",
			description: "Seed film — seans uchun.",
			genres: ["Фантастика", "Приключения"],
			audioLanguages: ["ru", "en"],
			rating: 8.5,
			releasedAt: new Date("2024-03-01"),
		},
	});

	await prisma.platformSettings.upsert({
		where: { id: "default" },
		update: {},
		create: {
			id: "default",
			defaultCommissionUzs: 500,
			lockAfterDays: 7,
			notifyHourTashkent: 9,
		},
	});

	await prisma.cinemaBilling.upsert({
		where: { cinemaId: cinema.id },
		update: { monthlyPlanUzs: 2_500_000 },
		create: {
			cinemaId: cinema.id,
			monthlyPlanUzs: 2_500_000,
			commissionPerTicketUzs: null,
		},
	});

	const now = new Date();
	const year = Number(
		new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric" }).format(now),
	);
	const month = Number(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Tashkent",
			month: "2-digit",
		}).format(now),
	);
	const dueAt = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:00`);
	await prisma.subscriptionInvoice.upsert({
		where: {
			cinemaId_periodYear_periodMonth: {
				cinemaId: cinema.id,
				periodYear: year,
				periodMonth: month,
			},
		},
		update: { status: "PAID", paidAt: dueAt, amountUzs: 2_500_000 },
		create: {
			cinemaId: cinema.id,
			periodYear: year,
			periodMonth: month,
			amountUzs: 2_500_000,
			status: "PAID",
			dueAt,
			paidAt: dueAt,
			publicNumber: `INV-${year}${String(month).padStart(2, "0")}-SEED`,
		},
	});

	console.log("Seeded:", {
		super: superAdmin.email,
		cinema: cinema.name,
		cinemaAdmin: cinemaAdmin.email,
	});
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
