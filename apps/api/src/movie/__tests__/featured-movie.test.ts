import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionUser } from "@cinema/types";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";
import { MovieService } from "../movie.service";

const ADMIN: SessionUser = {
	id: "u1",
	email: "admin@example.com",
	firstName: "Админ",
	lastName: null,
	mustChangePassword: false,
	role: "SUPER_ADMIN",
	staff: [],
};

const movieRow = {
	id: "m1",
	cinemaId: "c1",
	title: "Film",
	description: null,
	posterUrl: null,
	durationMin: 100,
	rating: null,
	ageRating: null,
	genres: [] as string[],
	audioLanguages: [] as string[],
	releasedAt: null,
	status: "ACTIVE" as const,
	isFeatured: false,
	createdAt: new Date("2026-09-28T00:00:00.000Z"),
	updatedAt: new Date("2026-09-28T00:00:00.000Z"),
};

function build() {
	const calls: Array<{ op: string; where?: unknown }> = [];
	const tx = {
		$queryRaw: async () => {
			calls.push({ op: "lock" });
			return [];
		},
		movie: {
			updateMany: async (args: { where: unknown }) => {
				calls.push({ op: "updateMany", where: args.where });
				return { count: 1 };
			},
			update: async (args: { data: { isFeatured?: boolean } }) => {
				calls.push({ op: "update" });
				return { ...movieRow, isFeatured: args.data.isFeatured ?? movieRow.isFeatured };
			},
			create: async (args: { data: { isFeatured?: boolean; cinemaId: string } }) => {
				calls.push({ op: "create" });
				return { ...movieRow, id: "m2", cinemaId: args.data.cinemaId, isFeatured: true };
			},
		},
	};
	const prisma = {
		movie: {
			findUnique: async () => movieRow,
		},
		$transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
	} as unknown as PrismaService;
	const redis = {
		client: { keys: async () => [], del: async () => 0 },
	} as unknown as RedisService;
	return { service: new MovieService(prisma, redis), calls };
}

describe("MovieService single featured movie", () => {
	it("clears other featured movies of the cinema in the same transaction", async () => {
		const { service, calls } = build();
		const updated = await service.update(ADMIN, "m1", { isFeatured: true });
		assert.equal(updated.isFeatured, true);
		assert.deepEqual(
			calls.map((call) => call.op),
			["lock", "updateMany", "update"],
		);
		assert.deepEqual(calls[1]?.where, {
			cinemaId: "c1",
			isFeatured: true,
			id: { not: "m1" },
		});
	});

	it("does not clear other movies when isFeatured is set false", async () => {
		const { service, calls } = build();
		await service.update(ADMIN, "m1", { isFeatured: false });
		assert.deepEqual(
			calls.map((call) => call.op),
			["update"],
		);
	});

	it("clears the cinema before creating a featured movie", async () => {
		const { service, calls } = build();
		const created = await service.create(ADMIN, {
			title: "New",
			durationMin: 90,
			cinemaId: "c1",
			isFeatured: true,
			genres: [],
			audioLanguages: [],
		});
		assert.equal(created.isFeatured, true);
		assert.deepEqual(
			calls.map((call) => call.op),
			["lock", "updateMany", "create"],
		);
		assert.deepEqual(calls[1]?.where, { cinemaId: "c1", isFeatured: true });
	});
});
