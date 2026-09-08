import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { BookingService } from "./booking.service";

@Injectable()
export class HoldExpiryScheduler implements OnModuleInit, OnModuleDestroy {
	private readonly log = new Logger(HoldExpiryScheduler.name);
	private timer?: ReturnType<typeof setInterval>;

	constructor(private readonly booking: BookingService) {}

	onModuleInit() {
		void this.tick();
		this.timer = setInterval(() => void this.tick(), 60_000);
	}

	onModuleDestroy() {
		if (this.timer) clearInterval(this.timer);
	}

	private async tick() {
		try {
			const { released } = await this.booking.releaseExpiredHolds();
			if (released > 0) {
				this.log.log(`Released ${released} expired hold seat(s)`);
			}
		} catch (err) {
			this.log.warn(`Hold expiry failed: ${err instanceof Error ? err.message : err}`);
		}
	}
}
