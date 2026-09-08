import "reflect-metadata";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const config = app.get(ConfigService);
	const origins = (config.get<string>("CORS_ORIGINS") ?? "http://localhost:3000")
		.split(",")
		.map((s) => s.trim());

	app.use(cookieParser());
	app.enableCors({
		origin: origins,
		credentials: true,
	});
	app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });

	const port = Number(config.get("API_PORT") ?? 3001);
	await app.listen(port);
}

bootstrap();
