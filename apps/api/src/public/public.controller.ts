import type { SessionUser } from "@cinema/types";
import { catalogQuerySchema } from "@cinema/validation";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import { PublicService } from "./public.service";

@Controller("public")
export class PublicController {
	constructor(private readonly pub: PublicService) {}

	@Get("catalog")
	catalog(
		@Query("from") from?: string,
		@Query("to") to?: string,
		@Query("cinemaId") cinemaId?: string,
	) {
		return this.pub.catalog(catalogQuerySchema.parse({ from, to, cinemaId }));
	}

	@Get("cinemas")
	cinemas() {
		return this.pub.cinemas();
	}

	@Get("cinemas/:id/map")
	cinemaMap(@Param("id") id: string) {
		return this.pub.cinemaMap(id);
	}

	@Get("cinemas/:id")
	@UseGuards(OptionalSessionGuard)
	cinema(@Param("id") id: string, @CurrentUser() user?: SessionUser) {
		return this.pub.cinema(id, user);
	}

	@Get("movies/:id")
	movie(@Param("id") id: string) {
		return this.pub.movie(id);
	}

	@Get("sessions/:id")
	session(@Param("id") id: string) {
		return this.pub.session(id);
	}
}
