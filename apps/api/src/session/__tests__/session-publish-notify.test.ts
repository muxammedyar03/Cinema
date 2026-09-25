import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import type { SessionUser } from "@cinema/types";
import { Logger } from "@nestjs/common";
import type { SessionPublishedNotifyService } from "../../notify/session-published.notify";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";
import { SessionService } from "../session.service";

const ADMIN: SessionUser = { id: "u1", email: null, role: "SUPER_ADMIN", staff: [] };

function build(onSessionPublished: () => Promise<unknown>) {
	let status = "DRAFT";
	const prisma = {
		session: {
			findUnique: async () => ({ id: "ses_1", cinemaId: "cin_1", status }),
			update: async ({ data }: { data: { status: string } }) => {
				status = data.status;
			},
		},
	} as unknown as PrismaService;
	const redis = { client: { keys: async () => [], del: async () => 0 } } as unknown as RedisService;
	const notify = { onSessionPublished } as unknown as SessionPublishedNotifyService;
	return new SessionService(prisma, redis, notify);
}

const flush = () => new Promise((r) => setImmediate(r));

describe("SessionService.publish → follow digest scheduling", () => {
	it("keeps publish successful and logs sessionId + error when scheduling fails", async () => {
		const errorSpy = mock.method(Logger.prototype, "error", () => undefined);
		try {
			const service = build(async () => {
				throw new Error("connect ECONNREFUSED 127.0.0.1:6379");
			});
			const result = await service.publish(ADMIN, "ses_1");
			await flush();

			assert.equal(result.status, "PUBLISHED");
			assert.equal(errorSpy.mock.callCount(), 1);
			const [message, stack] = errorSpy.mock.calls[0].arguments as [string, string];
			assert.match(message, /ses_1/);
			assert.match(message, /cin_1/);
			assert.match(message, /ECONNREFUSED/);
			assert.match(stack, /Error: connect ECONNREFUSED/);
		} finally {
			errorSpy.mock.restore();
		}
	});

	it("does not log when scheduling succeeds", async () => {
		const errorSpy = mock.method(Logger.prototype, "error", () => undefined);
		try {
			const service = build(async () => ({ scheduled: true }));
			await service.publish(ADMIN, "ses_1");
			await flush();
			assert.equal(errorSpy.mock.callCount(), 0);
		} finally {
			errorSpy.mock.restore();
		}
	});
});
