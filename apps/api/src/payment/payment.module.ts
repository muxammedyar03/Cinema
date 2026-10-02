import { Module } from "@nestjs/common";
import { InternalSecretGuard } from "./internal-secret.guard";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
	controllers: [PaymentController],
	providers: [PaymentService, InternalSecretGuard],
})
export class PaymentModule {}
