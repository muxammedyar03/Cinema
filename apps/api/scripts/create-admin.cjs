// Run inside the API container; credentials are supplied through environment variables.
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();
async function main() {
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD;
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 16) {
		throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters).");
	}
	// Never overwrite an existing user or reset credentials on a redeploy.
	await prisma.user.create({
		data: { email, passwordHash: await hash(password, 12), role: "SUPER_ADMIN" },
	});
	process.stdout.write("Super admin created.\n");
}
main()
	.catch((error) => {
		process.stderr.write(
			error.code === "P2002"
				? "User already exists; no changes made.\n"
				: "Admin creation failed; verify credentials and database connectivity.\n",
		);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
