import type { SessionUser } from "@cinema/types";
import {
	changePasswordSchema,
	cinemaLocationSchema,
	confirmEmailSchema,
	createCinemaPhotoSchema,
	linkEmailSchema,
	patchCinemaProfileSchema,
	photoUploadUrlSchema,
	reorderCinemaPhotosSchema,
} from "@cinema/validation";
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Put,
	type RawBodyRequest,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { CinemaProfileService } from "./cinema-profile.service";

@Controller("admin/cinemas")
@UseGuards(SessionGuard, RolesGuard)
export class CinemaProfileController {
	constructor(private readonly profiles: CinemaProfileService) {}

	@Get(":id/profile")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	profile(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.profiles.getProfile(user, id);
	}

	@Patch(":id/profile")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	patchProfile(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.patchProfile(user, id, patchCinemaProfileSchema.parse(body));
	}

	@Patch(":id/location")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	location(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.setLocation(user, id, cinemaLocationSchema.parse(body));
	}

	@Post(":id/photos/upload-url")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	uploadUrl(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.createUploadUrl(user, id, photoUploadUrlSchema.parse(body));
	}

	@Put(":id/photos/put/:token")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	putPhoto(
		@Param("id") id: string,
		@Param("token") token: string,
		@Req() req: RawBodyRequest<Request>,
	) {
		const body = req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : undefined);
		return this.profiles.putUploadedBytes(id, token, body, req.headers["content-type"]);
	}

	@Post(":id/photos")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	addPhoto(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.addPhoto(user, id, createCinemaPhotoSchema.parse(body));
	}

	@Patch(":id/photos/reorder")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	reorder(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		const parsed = reorderCinemaPhotosSchema.parse(body);
		return this.profiles.reorderPhotos(user, id, parsed.photoIds);
	}

	@Delete(":id/photos/:photoId")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	removePhoto(
		@CurrentUser() user: SessionUser,
		@Param("id") id: string,
		@Param("photoId") photoId: string,
	) {
		return this.profiles.deletePhoto(user, id, photoId);
	}

	@Get(":id/security/status")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	securityStatus(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.profiles.securityStatus(user, id);
	}

	@Post(":id/security/change-password")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	changePassword(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.changePassword(user, id, changePasswordSchema.parse(body));
	}

	@Post(":id/security/link-email")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	linkEmail(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.linkEmail(user, id, linkEmailSchema.parse(body).email);
	}

	@Post(":id/security/confirm-email")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	confirmEmail(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.profiles.confirmEmail(user, id, confirmEmailSchema.parse(body).token);
	}
}
