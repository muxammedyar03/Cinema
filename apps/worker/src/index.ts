import { workerConfig } from "./config.js";
import { prisma } from "./db.js";
import { startFollowDigestWorker } from "./follow-digest/follow-digest.worker.js";
import { startTelegramNotifyWorker } from "./telegram-notify.worker.js";

async function main() {
	if (!workerConfig.databaseUrl) {
		throw new Error("DATABASE_URL is required");
	}
	const worker = startTelegramNotifyWorker();
	const digestWorker = startFollowDigestWorker();
	console.log("Worker listening on queues telegram-notify, follow-digest");

	const shutdown = async () => {
		await Promise.all([worker.close(), digestWorker.close()]);
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
