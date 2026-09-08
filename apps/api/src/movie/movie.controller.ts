import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import type { SessionUser } from "@cinema/types";
import { createMovieSchema, updateMovieSchema } from "@cinema/validation";
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { BillingLockGuard } from "../billing/billing-lock.guard";
import { MovieService } from "./movie.service";

const POSTER_DIR = join(process.cwd(), "uploads", "posters");
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function ensurePosterDir() {
	if (!existsSync(POSTER_DIR)) {
		mkdirSync(POSTER_DIR, { recursive: true });
	}
}

@Controller("admin/movies")
@UseGuards(SessionGuard, RolesGuard, BillingLockGuard)
export class MovieController {
	constructor(
		private readonly movies: MovieService,
		private readonly config: ConfigService,
	) {}

	@Get()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	list(@CurrentUser() user: SessionUser) {
		return this.movies.list(user);
	}

	@Post("upload-poster")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	@UseInterceptors(
		FileInterceptor("file", {
			storage: diskStorage({
				destination: (_req, _file, cb) => {
					ensurePosterDir();
					cb(null, POSTER_DIR);
				},
				filename: (_req, file, cb) => {
					const ext = extname(file.originalname).toLowerCase() || ".jpg";
					cb(null, `${randomUUID()}${ext}`);
				},
			}),
			limits: { fileSize: 5 * 1024 * 1024 },
			fileFilter: (_req, file, cb) => {
				if (!ALLOWED_MIME.has(file.mimetype)) {
					cb(new BadRequestException("Допустимы JPEG, PNG, WebP или GIF") as Error, false);
					return;
				}
				cb(null, true);
			},
		}),
	)
	uploadPoster(@UploadedFile() file?: Express.Multer.File) {
		if (!file) {
			throw new BadRequestException("Файл не загружен");
		}
		const base =
			this.config.get<string>("PUBLIC_API_URL") ??
			this.config.get<string>("NEXT_PUBLIC_API_URL") ??
			"http://localhost:3001";
		return { url: `${base.replace(/\/$/, "")}/uploads/posters/${file.filename}` };
	}

	@Get(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN", "STAFF")
	get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.movies.get(user, id);
	}

	@Post()
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
		return this.movies.create(user, createMovieSchema.parse(body));
	}

	@Patch(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() body: unknown) {
		return this.movies.update(user, id, updateMovieSchema.parse(body));
	}

	@Post(":id/archive")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	archive(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.movies.archive(user, id);
	}

	@Post(":id/restore")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	restore(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.movies.restore(user, id);
	}

	@Delete(":id")
	@Roles("SUPER_ADMIN", "CINEMA_ADMIN")
	remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
		return this.movies.remove(user, id);
	}
}
