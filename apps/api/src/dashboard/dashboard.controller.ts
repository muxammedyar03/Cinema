import type { SessionUser } from "@cinema/types";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { DashboardService } from "./dashboard.service";

@Controller("admin/dashboard")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class DashboardController {
	constructor(private readonly dashboard: DashboardService) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	overview(@CurrentUser() user: SessionUser) {
		return this.dashboard.overview(user);
	}
}
