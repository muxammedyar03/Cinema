import type { SessionUser } from "@cinema/types";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { OrderService } from "./order.service";

@Controller("admin/orders")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class OrderController {
	constructor(private readonly orders: OrderService) {}

	@Get(":id")
	@Roles("CINEMA_ADMIN", "STAFF")
	detail(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.orders.detail(user, id);
	}
	@Get()
	@Roles("CINEMA_ADMIN", "STAFF")
	list(@CurrentUser() user: SessionUser) {
		return this.orders.listAdmin(user);
	}
}
