import { Module } from "@nestjs/common";
import { SessionPublishedNotifyService } from "./session-published.notify";

@Module({
	providers: [SessionPublishedNotifyService],
	exports: [SessionPublishedNotifyService],
})
export class NotifyModule {}
