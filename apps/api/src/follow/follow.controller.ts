import type { SessionUser } from "@cinema/types";
import { Controller, Delete, Get, HttpCode, Param, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import { SessionGuard } from "../auth/session.guard";
import { FollowService } from "./follow.service";

/**
 * Customer follow routes mounted under `public/` to match neighboring Mini App APIs.
 * Semantics: docs/contracts/follow-notify.md
 */
@Controller()
export class FollowController {
	constructor(private readonly follows: FollowService) {}

	@Post("public/cinemas/:cinemaId/follow")
	@UseGuards(SessionGuard)
	async follow(
		@CurrentUser() user: SessionUser,
		@Param("cinemaId") cinemaId: string,
		@Res({ passthrough: true }) res: Response,
	) {
		const result = await this.follows.follow(user, cinemaId);
		res.status(result.created ? 201 : 200);
		return result;
	}

	@Delete("public/cinemas/:cinemaId/follow")
	@UseGuards(SessionGuard)
	@HttpCode(200)
	unfollow(@CurrentUser() user: SessionUser, @Param("cinemaId") cinemaId: string) {
		return this.follows.unfollow(user, cinemaId);
	}

	@Get("public/cinemas/:cinemaId/follow")
	@UseGuards(OptionalSessionGuard)
	status(@CurrentUser() user: SessionUser | undefined, @Param("cinemaId") cinemaId: string) {
		return this.follows.status(user, cinemaId);
	}

	@Get("me/follows")
	@UseGuards(SessionGuard)
	mine(@CurrentUser() user: SessionUser) {
		return this.follows.listMine(user);
	}
}
