import type { SessionUser } from "@cinema/types";
import { holdGaSchema, holdSeatsSchema } from "@cinema/validation";
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BookingService } from "./booking.service";

@Controller("bookings")
@UseGuards(SessionGuard)
export class BookingController {
	constructor(private readonly booking: BookingService) {}

	@Post("hold")
	hold(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		const input = holdSeatsSchema.parse(body);
		return this.booking.holdSeats(user, input);
	}

	@Post("hold-ga")
	holdGa(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		const input = holdGaSchema.parse(body);
		return this.booking.holdGa(user, input);
	}

	@Get("orders")
	listMine(@CurrentUser() user: SessionUser) {
		return this.booking.listMyOrders(user);
	}

	@Get("orders/:id")
	getOrder(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.booking.getOrder(user, id);
	}

	@Post("expire-holds")
	@UseGuards(RolesGuard)
	@Roles("SUPER_ADMIN")
	expire() {
		return this.booking.releaseExpiredHolds();
	}
}
