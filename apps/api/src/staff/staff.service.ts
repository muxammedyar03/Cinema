import type { SessionUser } from "@cinema/types";
import type { CreateStaffInput, UpdateStaffInput } from "@cinema/validation";
import { normalizeLogin } from "@cinema/validation";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { canAccessCinema, canManageCinema } from "../auth/roles.guard";
import { blankToNull } from "../common/blank";
import { PrismaService } from "../prisma/prisma.service";

const staffUserSelect = {
	id: true,
	login: true,
	email: true,
	firstName: true,
	lastName: true,
	mustChangePassword: true,
} as const;

type StaffRow = {
	id: string;
	cinemaId: string;
	role: "CINEMA_ADMIN" | "STAFF";
	active: boolean;
	createdAt: Date;
	user: {
		id: string;
		login: string | null;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		mustChangePassword: boolean;
	};
};

function toStaffDto(row: StaffRow) {
	return {
		id: row.id,
		userId: row.user.id,
		cinemaId: row.cinemaId,
		login: row.user.login,
		email: row.user.email,
		firstName: row.user.firstName,
		lastName: row.user.lastName,
		role: row.role,
		active: row.active,
		mustChangePassword: row.user.mustChangePassword,
		createdAt: row.createdAt,
	};
}

@Injectable()
export class StaffService {
	constructor(private readonly prisma: PrismaService) {}

	async list(user: SessionUser, cinemaId?: string) {
		if (cinemaId && !canAccessCinema(user, cinemaId)) {
			throw new ForbiddenException({
				statusCode: 403,
				code: "NOT_CINEMA_STAFF",
				message: "Нет доступа к этому кинотеатру",
			});
		}
		const cinemaIds = user.role === "SUPER_ADMIN" ? null : user.staff.map((s) => s.cinemaId);
		const rows = await this.prisma.cinemaStaff.findMany({
			where: {
				...(cinemaId ? { cinemaId } : {}),
				...(cinemaIds ? { cinemaId: { in: cinemaIds } } : {}),
			},
			orderBy: { createdAt: "asc" },
			include: { user: { select: staffUserSelect } },
		});
		return rows.map((row) => toStaffDto(row));
	}

	async create(user: SessionUser, data: CreateStaffInput) {
		const cinemaId = this.resolveCinemaId(user, data.cinemaId);
		const cinema = await this.prisma.cinema.findUnique({ where: { id: cinemaId } });
		if (!cinema) {
			throw new NotFoundException({
				statusCode: 404,
				code: "CINEMA_NOT_FOUND",
				message: "Кинотеатр не найден",
			});
		}

		const login = normalizeLogin(data.login);
		const existing = await this.prisma.user.findUnique({ where: { login } });
		if (existing) {
			throw loginTaken();
		}

		const passwordHash = await hash(data.password, 10);
		try {
			const staff = await this.prisma.$transaction(async (tx) => {
				const created = await tx.user.create({
					data: {
						login,
						passwordHash,
						firstName: blankToNull(data.firstName) ?? null,
						lastName: blankToNull(data.lastName) ?? null,
						role: "CUSTOMER",
						mustChangePassword: true,
					},
				});
				return tx.cinemaStaff.create({
					data: {
						cinemaId,
						userId: created.id,
						role: data.role,
						active: true,
					},
					include: { user: { select: staffUserSelect } },
				});
			});
			return toStaffDto(staff);
		} catch (err) {
			if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
				throw loginTaken();
			}
			throw err;
		}
	}

	async update(user: SessionUser, id: string, data: UpdateStaffInput) {
		const staff = await this.prisma.cinemaStaff.findUnique({
			where: { id },
			include: { user: { select: staffUserSelect } },
		});
		if (!staff) {
			throw new NotFoundException({
				statusCode: 404,
				code: "STAFF_NOT_FOUND",
				message: "Сотрудник не найден",
			});
		}
		if (!canManageCinema(user, staff.cinemaId)) {
			throw new ForbiddenException({
				statusCode: 403,
				code: "NOT_CINEMA_STAFF",
				message: "Недостаточно прав",
			});
		}
		if (staff.userId === user.id) {
			throw new BadRequestException({
				statusCode: 400,
				code: "STAFF_SELF_UPDATE",
				message: "Нельзя изменить собственную учётную запись",
			});
		}

		const nextRole = data.role ?? staff.role;
		const nextActive = data.active ?? staff.active;
		const demotingAdmin =
			staff.role === "CINEMA_ADMIN" &&
			staff.active &&
			(nextRole !== "CINEMA_ADMIN" || nextActive === false);
		if (demotingAdmin) {
			const others = await this.prisma.cinemaStaff.count({
				where: {
					cinemaId: staff.cinemaId,
					role: "CINEMA_ADMIN",
					active: true,
					id: { not: staff.id },
				},
			});
			if (others === 0) {
				throw new ConflictException({
					statusCode: 409,
					code: "LAST_CINEMA_ADMIN",
					message: "Нельзя снять последнего администратора кинотеатра",
				});
			}
		}

		const updated = await this.prisma.cinemaStaff.update({
			where: { id },
			data: {
				...(data.role !== undefined ? { role: data.role } : {}),
				...(data.active !== undefined ? { active: data.active } : {}),
			},
			include: { user: { select: staffUserSelect } },
		});
		return toStaffDto(updated);
	}

	private resolveCinemaId(user: SessionUser, cinemaId?: string): string {
		if (user.role === "SUPER_ADMIN") {
			if (!cinemaId) {
				throw new BadRequestException({
					statusCode: 400,
					code: "CINEMA_REQUIRED",
					message: "Укажите кинотеатр",
				});
			}
			return cinemaId;
		}
		if (cinemaId && !canManageCinema(user, cinemaId)) {
			throw new ForbiddenException({
				statusCode: 403,
				code: "NOT_CINEMA_STAFF",
				message: "Нельзя создать сотрудника в другом кинотеатре",
			});
		}
		const own =
			cinemaId ??
			user.staff.find((s) => s.role === "CINEMA_ADMIN")?.cinemaId ??
			user.staff[0]?.cinemaId;
		if (!own || !canManageCinema(user, own)) {
			throw new ForbiddenException({
				statusCode: 403,
				code: "NOT_CINEMA_STAFF",
				message: "Недостаточно прав",
			});
		}
		return own;
	}
}

function loginTaken(): ConflictException {
	return new ConflictException({
		statusCode: 409,
		code: "LOGIN_TAKEN",
		message: "Такой логин уже занят",
	});
}
