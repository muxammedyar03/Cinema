import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { BookingModule } from "./booking/booking.module";
import { CinemaModule } from "./cinema/cinema.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HallModule } from "./hall/hall.module";
import { HealthController } from "./health/health.controller";
import { MovieModule } from "./movie/movie.module";
import { OrderModule } from "./order/order.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicModule } from "./public/public.module";
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
		AuthModule,
		CinemaModule,
		HallModule,
		MovieModule,
		SessionModule,
		PublicModule,
		DashboardModule,
		BookingModule,
		OrderModule,
		BillingModule,
	],
	controllers: [HealthController],
})
export class AppModule {}
