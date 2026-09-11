import type { SessionUser } from "@cinema/types";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { DashboardService } from "./dashboard.service";
import { parseChartRange } from "./dashboard-time";

@Controller("admin/dashboard")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class DashboardController {
	constructor(private readonly dashboard: DashboardService) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	overview(@CurrentUser() user: SessionUser, @Query("range") range?: string) {
		return this.dashboard.overview(user, parseChartRange(range));
	}
}
