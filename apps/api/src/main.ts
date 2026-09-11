import "reflect-metadata";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";

function readRequestBody(req: Request): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		rawBody: true,
		bodyParser: false,
	});
	const config = app.get(ConfigService);
	const origins = (config.get<string>("CORS_ORIGINS") ?? "http://localhost:3000")
		.split(",")
		.map((s) => s.trim());

	app.use(cookieParser());
	app.use((req: Request, res: Response, next: NextFunction) => {
		if (req.method === "PUT" && /\/photos\/put\//.test(req.originalUrl)) {
			void readRequestBody(req)
				.then((buf) => {
					req.body = buf;
					(req as Request & { rawBody?: Buffer }).rawBody = buf;
					next();
				})
				.catch(next);
			return;
		}
		const contentType = req.headers["content-type"] ?? "";
		if (contentType.includes("application/json")) {
			void readRequestBody(req)
				.then((buf) => {
					const raw = buf.toString("utf8").trim();
					req.body = raw.length > 0 ? JSON.parse(raw) : {};
					next();
				})
				.catch((err: unknown) => {
					if (err instanceof SyntaxError) {
						res.status(400).json({
							statusCode: 400,
							code: "BAD_JSON",
							message: "Некорректный JSON",
						});
						return;
					}
					next(err);
				});
			return;
		}
		next();
	});
	app.enableCors({
		origin: origins,
		credentials: true,
	});
	app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });

	const port = Number(config.get("API_PORT") ?? 3001);
	await app.listen(port);
}

bootstrap();
