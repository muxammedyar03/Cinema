import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { NotifyModule } from "../notify/notify.module";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

@Module({
	imports: [BillingModule, NotifyModule],
	controllers: [SessionController],
	providers: [SessionService],
	exports: [SessionService],
})
export class SessionModule {}
