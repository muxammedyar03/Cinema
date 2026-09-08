import { catalogQuerySchema } from "@cinema/validation";
import { Controller, Get, Param, Query } from "@nestjs/common";
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

	@Get("movies/:id")
	movie(@Param("id") id: string) {
		return this.pub.movie(id);
	}

	@Get("sessions/:id")
	session(@Param("id") id: string) {
		return this.pub.session(id);
	}
}
