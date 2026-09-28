import type { SessionUser } from "@cinema/types";
import { createStaffSchema, updateStaffSchema } from "@cinema/validation";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { parseBody } from "../common/parse-body";
import { StaffService } from "./staff.service";

@Controller("admin/staff")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class StaffController {
	constructor(private readonly staff: StaffService) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	list(@CurrentUser() user: SessionUser, @Query("cinemaId") cinemaId?: string) {
		return this.staff.list(user, cinemaId);
	}

	@Post()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		return this.staff.create(user, parseBody(createStaffSchema, body));
	}

	@Patch(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.staff.update(user, id, parseBody(updateStaffSchema, body));
	}
}
