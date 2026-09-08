import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { MovieController } from "./movie.controller";
import { MovieService } from "./movie.service";

@Module({
	imports: [BillingModule],
	controllers: [MovieController],
	providers: [MovieService],
	exports: [MovieService],
})
export class MovieModule {}
