import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
	imports: [BillingModule],
	controllers: [StaffController],
	providers: [StaffService],
})
export class StaffModule {}
