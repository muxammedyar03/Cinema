import { platformListQuerySchema } from "@cinema/validation";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { parseBody } from "../common/parse-body";
import { PlatformService } from "./platform.service";

function listQuery(cursor?: string, limit?: string) {
	const trimmed = cursor?.trim();
	return parseBody(platformListQuerySchema, {
		...(trimmed ? { cursor: trimmed } : {}),
		...(limit !== undefined && limit !== "" ? { limit } : {}),
	});
}

@Controller("admin/platform")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class PlatformController {
	constructor(private readonly platform: PlatformService) {}

	@Get("summary")
	@Roles("SUPER_ADMIN")
	summary() {
		return this.platform.summary();
	}

	@Get("admins")
	@Roles("SUPER_ADMIN")
	admins(@Query("cursor") cursor?: string, @Query("limit") limit?: string) {
		return this.platform.listAdmins(listQuery(cursor, limit));
	}

	@Get("cinemas")
	@Roles("SUPER_ADMIN")
	cinemas(@Query("cursor") cursor?: string, @Query("limit") limit?: string) {
		return this.platform.listCinemas(listQuery(cursor, limit));
	}
}
