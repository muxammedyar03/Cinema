import type { SessionUser } from "@cinema/types";
import {
	cinemaStatusSchema,
	createCinemaSchema,
	createClientSchema,
	updateCinemaSchema,
	updateClientSchema,
} from "@cinema/validation";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { CinemaService } from "./cinema.service";

@Controller("admin/cinemas")
@UseGuards(SessionGuard, RolesGuard)
export class CinemaController {
	constructor(private readonly cinemas: CinemaService) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	list(@CurrentUser() user: SessionUser) {
		return this.cinemas.list(user);
	}

	@Post()
	@Roles("SUPER_ADMIN")
	create(@Body() body: unknown) {
		const parsed = createClientSchema.safeParse(body);
		if (parsed.success) {
			return this.cinemas.createClient(parsed.data);
		}
		return this.cinemas.create(createCinemaSchema.parse(body));
	}

	@Get(":id/dossier")
	@Roles("SUPER_ADMIN")
	dossier(@Param("id") id: string) {
		return this.cinemas.getClientDossier(id);
	}

	@Get(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.cinemas.get(user, id);
	}

	@Patch(":id/client")
	@Roles("SUPER_ADMIN")
	updateClient(@Param("id") id: string, @Body() body: unknown) {
		return this.cinemas.updateClient(id, updateClientSchema.parse(body));
	}

	@Patch(":id")
	@Roles("SUPER_ADMIN")
	update(@Param("id") id: string, @Body() body: unknown) {
		return this.cinemas.update(id, updateCinemaSchema.parse(body));
	}

	@Patch(":id/status")
	@Roles("SUPER_ADMIN")
	status(@Param("id") id: string, @Body() body: unknown) {
		const { status } = cinemaStatusSchema.parse(body);
		return this.cinemas.setStatus(id, status);
	}

	@Delete(":id")
	@Roles("SUPER_ADMIN")
	remove(@Param("id") id: string) {
		return this.cinemas.remove(id);
	}
}
