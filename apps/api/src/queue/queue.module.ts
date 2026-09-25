import { Global, Module } from "@nestjs/common";
import { FollowDigestQueue } from "./follow-digest.queue";
import { TelegramNotifyQueue } from "./telegram-notify.queue";

@Global()
@Module({
	providers: [TelegramNotifyQueue, FollowDigestQueue],
	exports: [TelegramNotifyQueue, FollowDigestQueue],
})
export class QueueModule {}
