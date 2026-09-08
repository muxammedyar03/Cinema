import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";
import { HoldExpiryScheduler } from "./hold-expiry.scheduler";

@Module({
	imports: [AuthModule],
	controllers: [BookingController],
	providers: [BookingService, HoldExpiryScheduler],
	exports: [BookingService],
})
export class BookingModule {}
