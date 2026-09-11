import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OptionalSessionGuard } from "./optional-session.guard";
import { RolesGuard } from "./roles.guard";
import { SessionGuard } from "./session.guard";

@Global()
@Module({
	controllers: [AuthController],
	providers: [AuthService, SessionGuard, OptionalSessionGuard, RolesGuard],
	exports: [AuthService, SessionGuard, OptionalSessionGuard, RolesGuard],
})
export class AuthModule {}
