import { Module } from "@nestjs/common";
import { InternalSecretGuard } from "../payment/internal-secret.guard";
import { BotTicketsController } from "./bot-tickets.controller";

@Module({ controllers: [BotTicketsController], providers: [InternalSecretGuard] })
export class BotTicketsModule {}
