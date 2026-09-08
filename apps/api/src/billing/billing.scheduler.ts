import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { BillingService } from "./billing.service";

@Injectable()
export class BillingScheduler implements OnModuleInit, OnModuleDestroy {
	private readonly log = new Logger(BillingScheduler.name);
	private timer?: ReturnType<typeof setInterval>;

	constructor(private readonly billing: BillingService) {}

	onModuleInit() {
		void this.tick();
		// every 30 min — notifications fire once/day after notifyHour
		this.timer = setInterval(() => void this.tick(), 30 * 60_000);
	}

	onModuleDestroy() {
		if (this.timer) clearInterval(this.timer);
	}

	private async tick() {
		try {
			const result = await this.billing.runDailyMaintenance();
			if (result.notified || result.locked || result.markedOverdue) {
				this.log.log(
					`Billing maintenance: overdue=${result.markedOverdue} notified=${result.notified} locked=${result.locked}`,
				);
			}
		} catch (err) {
			this.log.warn(`Billing maintenance failed: ${err instanceof Error ? err.message : err}`);
		}
	}
}
