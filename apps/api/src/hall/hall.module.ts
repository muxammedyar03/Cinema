import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { HallController } from "./hall.controller";
import { HallService } from "./hall.service";

@Module({
	imports: [BillingModule],
	controllers: [HallController],
	providers: [HallService],
})
export class HallModule {}
