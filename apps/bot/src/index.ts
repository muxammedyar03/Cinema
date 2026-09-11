import { createServer } from "node:http";
import { webhookCallback } from "grammy";
import { createBot } from "./bot.js";
import { botConfig } from "./config.js";

async function main() {
	const bot = createBot();

	if (botConfig.mode === "webhook") {
		const handler = webhookCallback(bot, "http", {
			secretToken: botConfig.webhookSecret,
		});
		const server = createServer((req, res) => {
			if (req.url?.startsWith(botConfig.webhookPath)) {
				void handler(req, res);
				return;
			}
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("Cinema Telegram bot OK");
		});
		server.listen(botConfig.port, () => {
			console.log(`Bot webhook listening on :${botConfig.port}${botConfig.webhookPath}`);
		});
		if (botConfig.webhookUrl) {
			await bot.api.setWebhook(botConfig.webhookUrl, {
				secret_token: botConfig.webhookSecret,
			});
			console.log(`Webhook set to ${botConfig.webhookUrl}`);
		}
		return;
	}

	await bot.api.deleteWebhook({ drop_pending_updates: false });
	console.log("Bot starting in long-polling mode…");
	await bot.start({
		onStart: (info) => {
			console.log(`Bot @${info.username} ready (polling)`);
		},
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
