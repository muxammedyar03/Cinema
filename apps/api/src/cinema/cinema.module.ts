import { Module } from "@nestjs/common";
import { CinemaController } from "./cinema.controller";
import { CinemaService } from "./cinema.service";
import { CinemaProfileController } from "./cinema-profile.controller";
import { CinemaProfileService } from "./cinema-profile.service";

@Module({
	controllers: [CinemaController, CinemaProfileController],
	providers: [CinemaService, CinemaProfileService],
	exports: [CinemaService, CinemaProfileService],
})
export class CinemaModule {}
