import { Module } from "@nestjs/common";
import { InternalSecretGuard } from "./internal-secret.guard";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { RahmatController } from "./rahmat.controller";
import { RahmatService } from "./rahmat.service";
import { RahmatClient } from "./rahmat-client";

@Module({
	controllers: [PaymentController, RahmatController],
	providers: [PaymentService, InternalSecretGuard, RahmatClient, RahmatService],
})
export class PaymentModule {}
