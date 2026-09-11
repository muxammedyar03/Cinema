import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { BookingModule } from "./booking/booking.module";
import { CinemaModule } from "./cinema/cinema.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { FollowModule } from "./follow/follow.module";
import { HallModule } from "./hall/hall.module";
import { HealthController } from "./health/health.controller";
import { MovieModule } from "./movie/movie.module";
import { NotifyModule } from "./notify/notify.module";
import { OrderModule } from "./order/order.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicModule } from "./public/public.module";
import { QueueModule } from "./queue/queue.module";
import { RedisModule } from "./redis/redis.module";
import { SessionModule } from "./session/session.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env", "../../.env"],
		}),
		PrismaModule,
		RedisModule,
		QueueModule,
		AuthModule,
		CinemaModule,
		HallModule,
		MovieModule,
		SessionModule,
		PublicModule,
		FollowModule,
		NotifyModule,
		DashboardModule,
		BookingModule,
		OrderModule,
		BillingModule,
	],
	controllers: [HealthController],
})
export class AppModule {}
