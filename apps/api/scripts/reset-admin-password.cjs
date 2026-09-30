// Run inside the API container. The password is passed via an ephemeral environment variable.
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD;
	if (!email || !password || password.length < 16) {
		throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters).");
	}

	const result = await prisma.user.updateMany({
		where: { email, role: "SUPER_ADMIN" },
		data: { passwordHash: await hash(password, 12) },
	});
	if (result.count !== 1) {
		throw new Error("Super admin not found; password was not changed.");
	}
	process.stdout.write("Super admin password updated.\n");
}

main()
	.catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
