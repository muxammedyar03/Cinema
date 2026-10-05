import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { AdminRefundController, CustomerRefundController } from "./refund.controller";
import { RefundService } from "./refund.service";

@Module({
	imports: [BillingModule],
	controllers: [OrderController, CustomerRefundController, AdminRefundController],
	providers: [OrderService, RefundService],
})
export class OrderModule {}
