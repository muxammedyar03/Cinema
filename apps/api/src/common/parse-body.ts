import { BadRequestException } from "@nestjs/common";
import type { ZodType } from "zod";

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		throw new BadRequestException({
			statusCode: 400,
			code: "VALIDATION_ERROR",
			message: parsed.error.issues[0]?.message ?? "Некорректные данные",
		});
	}
	return parsed.data;
}
