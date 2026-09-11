const API = "https://api.telegram.org";

export type SendMessageResult =
	| { ok: true; messageId: number }
	| { ok: false; description: string; retryable: boolean };

export async function sendTelegramMessage(opts: {
	token: string;
	chatId: string;
	text: string;
	replyMarkup?: unknown;
}): Promise<SendMessageResult> {
	const res = await fetch(`${API}/bot${opts.token}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: opts.chatId,
			text: opts.text,
			parse_mode: "HTML",
			disable_web_page_preview: true,
			reply_markup: opts.replyMarkup,
		}),
	});
	const data = (await res.json()) as {
		ok: boolean;
		description?: string;
		result?: { message_id: number };
		parameters?: { retry_after?: number };
	};
	if (!data.ok) {
		const desc = data.description ?? `HTTP ${res.status}`;
		const retryable =
			res.status === 429 ||
			res.status >= 500 ||
			desc.includes("Too Many Requests") ||
			desc.includes("retry after");
		return { ok: false, description: desc, retryable };
	}
	return { ok: true, messageId: data.result?.message_id ?? 0 };
}
