import { botConfig } from "./config.js";

export type PreCheckoutRequest = {
	orderId: string;
	totalAmount: number;
	currency: string;
	telegramUserId: string;
};

export type SuccessfulPaymentRequest = PreCheckoutRequest & {
	telegramPaymentChargeId: string;
	providerPaymentChargeId: string;
};

const FALLBACK = "Не удалось проверить заказ. Попробуйте ещё раз.";

export class PaymentApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "PaymentApiError";
		this.status = status;
	}
}

export function interpretPreCheckoutResponse(
	status: number,
	body: unknown,
): { ok: true } | { ok: false; errorMessage: string } {
	if (status === 200 && body && typeof body === "object") {
		const record = body as { ok?: unknown; errorMessage?: unknown };
		if (record.ok === true) return { ok: true };
		if (
			record.ok === false &&
			typeof record.errorMessage === "string" &&
			record.errorMessage.trim()
		) {
			return { ok: false, errorMessage: record.errorMessage.trim() };
		}
	}
	return { ok: false, errorMessage: FALLBACK };
}

export function createPaymentClient(fetchImpl: typeof fetch = fetch) {
	return {
		preCheckout(input: PreCheckoutRequest) {
			return postJson("/internal/telegram-payments/pre-checkout", input, fetchImpl).then(
				async (res) => {
					const json = await readJson(res);
					return interpretPreCheckoutResponse(res.status, json);
				},
			);
		},
		async successfulPayment(input: SuccessfulPaymentRequest) {
			const res = await postJson("/internal/telegram-payments/successful", input, fetchImpl);
			if (!res.ok) {
				const json = await readJson(res);
				const message =
					json &&
					typeof json === "object" &&
					typeof (json as { message?: unknown }).message === "string"
						? (json as { message: string }).message
						: `API ${res.status}`;
				throw new PaymentApiError(message, res.status);
			}
		},
	};
}

async function postJson(path: string, body: unknown, fetchImpl: typeof fetch): Promise<Response> {
	const secret = botConfig.internalSecret();
	if (!secret) {
		throw new Error("INTERNAL_API_SECRET is unset");
	}
	return fetchImpl(`${botConfig.apiUrl()}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Internal-Secret": secret,
		},
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(8_000),
	});
}

async function readJson(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}
