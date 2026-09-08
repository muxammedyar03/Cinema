import type { SessionUser } from "@cinema/types";
import { createSessionSchema, updateSessionSchema } from "@cinema/validation";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { SessionService } from "./session.service";

@Controller("admin/sessions")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class SessionController {
	constructor(private readonly sessions: SessionService) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	list(@CurrentUser() user: SessionUser, @Query("cinemaId") cinemaId?: string) {
		return this.sessions.list(user, cinemaId);
	}

	@Post()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		return this.sessions.create(user, createSessionSchema.parse(body));
	}

	@Get(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.sessions.get(user, id);
	}

	@Patch(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.sessions.update(user, id, updateSessionSchema.parse(body));
	}

	@Post(":id/publish")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	publish(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.sessions.publish(user, id);
	}

	@Post(":id/cancel")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	cancel(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.sessions.cancel(user, id);
	}
}
