import type { SessionUser } from "@cinema/types";
import { createHallSchema, layoutSchema, updateHallSchema } from "@cinema/validation";
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Put,
	UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { HallService } from "./hall.service";

@Controller("admin/cinemas/:cinemaId/halls")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class HallController {
	constructor(private readonly halls: HallService) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	list(@CurrentUser() user: SessionUser, @Param("cinemaId") cinemaId: string) {
		return this.halls.list(user, cinemaId);
	}

	@Post()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	create(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Body() body: unknown,
	) {
		return this.halls.create(user, cinemaId, createHallSchema.parse(body));
	}

	@Get(":hallId")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	get(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Param("hallId") hallId: string,
	) {
		return this.halls.get(user, cinemaId, hallId);
	}

	@Get(":hallId/layout")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	layout(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Param("hallId") hallId: string,
	) {
		return this.halls.layout(user, cinemaId, hallId);
	}

	@Put(":hallId/layout")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	saveLayout(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Param("hallId") hallId: string,
		@Body() body: unknown,
	) {
		const parsed = layoutSchema.safeParse(body);
		if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
		return this.halls.saveLayout(user, cinemaId, hallId, parsed.data);
	}

	@Patch(":hallId")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	update(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Param("hallId") hallId: string,
		@Body() body: unknown,
	) {
		return this.halls.update(user, cinemaId, hallId, updateHallSchema.parse(body));
	}

	@Delete(":hallId")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	remove(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Param("hallId") hallId: string,
	) {
		return this.halls.remove(user, cinemaId, hallId);
	}
}
