import { Global, Module } from "@nestjs/common";
import { TelegramNotifyQueue } from "./telegram-notify.queue";

@Global()
@Module({
	providers: [TelegramNotifyQueue],
	exports: [TelegramNotifyQueue],
})
export class QueueModule {}
