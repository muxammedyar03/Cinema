import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
	imports: [BillingModule],
	controllers: [OrderController],
	providers: [OrderService],
})
export class OrderModule {}
