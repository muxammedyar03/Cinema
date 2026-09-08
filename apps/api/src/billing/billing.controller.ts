import type { SessionUser } from "@cinema/types";
import {
	cinemaBillingSchema,
	markInvoicePaidSchema,
	platformSettingsSchema,
} from "@cinema/validation";
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { AllowWhenLocked } from "./allow-when-locked.decorator";
import { BillingService } from "./billing.service";
import { BillingLockGuard } from "./billing-lock.guard";

@Controller("admin/billing")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class BillingController {
	constructor(private readonly billing: BillingService) {}

	@Get("access")
	@AllowWhenLocked()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	myAccess(@CurrentUser() user: SessionUser) {
		return this.billing.myAccess(user);
	}

	@Get("overview")
	@Roles("SUPER_ADMIN")
	overview() {
		return this.billing.overview();
	}

	@Get("invoices")
	@Roles("SUPER_ADMIN")
	invoices() {
		return this.billing.listInvoices();
	}

	@Get("settings")
	@Roles("SUPER_ADMIN")
	settings() {
		return this.billing.getSettings();
	}

	@Patch("settings")
	@Roles("SUPER_ADMIN")
	updateSettings(@Body() body: unknown) {
		return this.billing.updateSettings(platformSettingsSchema.parse(body));
	}

	@Patch("cinemas/:cinemaId")
	@Roles("SUPER_ADMIN")
	upsertCinemaBilling(@Param("cinemaId") cinemaId: string, @Body() body: unknown) {
		return this.billing.upsertCinemaBilling(cinemaId, cinemaBillingSchema.parse(body));
	}

	@Post("invoices/mark-paid")
	@Roles("SUPER_ADMIN")
	markPaid(@Body() body: unknown) {
		const { invoiceId } = markInvoicePaidSchema.parse(body);
		return this.billing.markPaid(invoiceId);
	}

	@Post("cinemas/:cinemaId/unlock")
	@Roles("SUPER_ADMIN")
	unlock(@Param("cinemaId") cinemaId: string) {
		return this.billing.unlockCinema(cinemaId);
	}

	/** Manual trigger for ops / tests */
	@Post("run-maintenance")
	@Roles("SUPER_ADMIN")
	runMaintenance() {
		return this.billing.runDailyMaintenance();
	}
}
