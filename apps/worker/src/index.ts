import { workerConfig } from "./config.js";
import { prisma } from "./db.js";
import { startTelegramNotifyWorker } from "./telegram-notify.worker.js";

async function main() {
	if (!workerConfig.databaseUrl) {
		throw new Error("DATABASE_URL is required");
	}
	const worker = startTelegramNotifyWorker();
	console.log("Worker listening on queue telegram-notify");

	const shutdown = async () => {
		await worker.close();
		await prisma.$disconnect();
		process.exit(0);
	};
	process.on("SIGINT", () => void shutdown());
	process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
