// Run inside the API container. The password is passed via an ephemeral environment variable.
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
const Redis = require("ioredis");

const prisma = new PrismaClient();
let redis;

async function main() {
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD;
	if (!email || !password || password.length < 16) {
		throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters).");
	}
	if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required to revoke sessions.");
	redis = new Redis(process.env.REDIS_URL, { lazyConnect: true });
	await redis.connect();
	const admin = await prisma.user.findUnique({ where: { email } });
	if (!admin || admin.role !== "SUPER_ADMIN") {
		throw new Error("Super admin not found; password was not changed.");
	}

	await prisma.user.update({
		where: { id: admin.id },
		data: { passwordHash: await hash(password, 12) },
	});

	let cursor = "0";
	let revoked = 0;
	do {
		const [next, keys] = await redis.scan(cursor, "MATCH", "session:*", "COUNT", 100);
		cursor = next;
		for (const key of keys) {
			const raw = await redis.get(key);
			if (!raw) continue;
			let session;
			try {
				session = JSON.parse(raw);
			} catch {
				// Leave malformed or unrelated session records untouched.
				continue;
			}
			if (session?.userId === admin.id) revoked += await redis.del(key);
		}
	} while (cursor !== "0");
	process.stdout.write(`Super admin password updated; ${revoked} old session(s) revoked.\n`);
}

main()
	.catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
		redis?.disconnect();
	});
