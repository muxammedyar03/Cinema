export type InvoiceLinkInput = {
	botToken: string;
	providerToken: string;
	title: string;
	description: string;
	payload: string;
	amountMinor: number;
};

type TelegramResponse = {
	ok?: boolean;
	result?: unknown;
	description?: string;
};

export async function createTelegramInvoiceLink(
	input: InvoiceLinkInput,
	fetchImpl: typeof fetch = fetch,
): Promise<string> {
	const response = await fetchImpl(
		`https://api.telegram.org/bot${input.botToken}/createInvoiceLink`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: input.title,
				description: input.description,
				payload: input.payload,
				provider_token: input.providerToken,
				currency: "UZS",
				prices: [{ label: "Билеты", amount: input.amountMinor }],
			}),
			signal: AbortSignal.timeout(8_000),
		},
	);
	const text = await response.text();
	let body: TelegramResponse;
	try {
		body = JSON.parse(text) as TelegramResponse;
	} catch {
		throw new Error("Telegram createInvoiceLink returned a non-JSON body");
	}
	if (!response.ok || body.ok !== true || typeof body.result !== "string" || !body.result) {
		const description = body.description ? `: ${body.description}` : "";
		throw new Error(`Telegram createInvoiceLink failed${description}`);
	}
	return body.result;
}
