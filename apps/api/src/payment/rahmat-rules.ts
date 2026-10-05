import { createHash, timingSafeEqual } from "node:crypto";

export function amountTiyin(uzs: number): number {
	const n = uzs * 100;
	if (!Number.isSafeInteger(n) || n <= 0 || n > 2147483647)
		throw new Error("Invalid payment amount");
	return n;
}

export function splitAmounts(amount: number, feeBps: number, commission: number) {
	if (
		!Number.isSafeInteger(amount) ||
		amount <= 0 ||
		!Number.isInteger(feeBps) ||
		feeBps < 0 ||
		feeBps >= 10000 ||
		!Number.isSafeInteger(commission) ||
		commission < 0
	)
		throw new Error("Invalid split configuration");
	const fee = Math.ceil((amount * feeBps) / 10000);
	const seller = amount - fee - commission;
	if (seller <= 0) throw new Error("Commission exceeds payment");
	return { seller, platform: commission, provider: fee };
}

export function verifyRahmatSign(
	fields: {
		store_id?: string | number;
		invoice_id: string;
		amount: number;
		uuid: string;
		sign: string;
	},
	secret: string,
	webhook: boolean,
) {
	if (!secret || !/^[a-f0-9]{32}$/i.test(fields.sign)) return false;
	const input = webhook
		? `${fields.uuid}${fields.amount}${secret}`
		: `${fields.store_id}${fields.invoice_id}${fields.amount}${secret}`;
	const expected = createHash("md5").update(input).digest();
	return timingSafeEqual(expected, Buffer.from(fields.sign, "hex"));
}
