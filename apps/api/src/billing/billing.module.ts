import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingScheduler } from "./billing.scheduler";
import { BillingService } from "./billing.service";
import { BillingLockGuard } from "./billing-lock.guard";

@Module({
	controllers: [BillingController],
	providers: [BillingService, BillingScheduler, BillingLockGuard],
	exports: [BillingService, BillingLockGuard],
})
export class BillingModule {}
