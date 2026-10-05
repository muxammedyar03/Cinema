import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type RahmatPurpose = "TICKET" | "SUBSCRIPTION";
export type ProviderPayment = {
	uuid: string;
	store_id: string | number;
	payment_amount: number;
	store_invoice_id: string;
	status: string;
	otp_hash: string | null;
};
export type ProviderInvoice = {
	uuid: string;
	checkout_url: string;
	deeplink?: string;
	payment?: ProviderPayment;
};

@Injectable()
export class RahmatClient {
	private tokens = new Map<RahmatPurpose, { token: string; expires: number }>();
	constructor(private readonly config: ConfigService) {}
	value(key: string): string {
		return this.config.get<string>(key)?.trim() ?? "";
	}
	required(key: string): string {
		const value = this.value(key);
		if (!value)
			throw new ServiceUnavailableException({
				code: "RAHMAT_NOT_CONFIGURED",
				message: `Missing ${key}`,
			});
		return value;
	}
	prefix(purpose: RahmatPurpose) {
		return purpose === "TICKET" ? "RAHMAT_TICKET" : "RAHMAT_SUBSCRIPTION";
	}
	store(purpose: RahmatPurpose) {
		const id = this.required(`${this.prefix(purpose)}_STORE_ID`);
		if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
			throw new ServiceUnavailableException("Rahmat store ID must be a positive integer");
		return id;
	}
	secret(purpose: RahmatPurpose) {
		return this.required(`${this.prefix(purpose)}_SECRET`);
	}
	enabled(purpose: RahmatPurpose) {
		const p = this.prefix(purpose);
		return Boolean(
			this.value(`${p}_APPLICATION_ID`) &&
				this.value(`${p}_SECRET`) &&
				this.value(`${p}_STORE_ID`) &&
				this.value("RAHMAT_PUBLIC_API_URL"),
		);
	}
	private base(): string {
		const base = this.value("RAHMAT_BASE_URL") || "https://dev-mesh.multicard.uz";
		if (!["https://dev-mesh.multicard.uz", "https://mesh.multicard.uz"].includes(base))
			throw new ServiceUnavailableException("Invalid Rahmat base URL");
		return base;
	}
	private async token(purpose: RahmatPurpose) {
		const cached = this.tokens.get(purpose);
		if (cached && cached.expires > Date.now()) return cached.token;
		const response = await fetch(`${this.base()}/auth`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				application_id: this.required(`${this.prefix(purpose)}_APPLICATION_ID`),
				secret: this.secret(purpose),
			}),
			signal: AbortSignal.timeout(10000),
		});
		const data = (await response.json()) as { token?: string };
		if (!response.ok || !data.token)
			throw new ServiceUnavailableException("Rahmat authentication failed");
		// Short cache avoids relying on an undocumented timezone in expiry.
		this.tokens.set(purpose, { token: data.token, expires: Date.now() + 60000 });
		return data.token;
	}
	async request<T>(
		purpose: RahmatPurpose,
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const token = await this.token(purpose);
		let response: Response;
		try {
			response = await fetch(`${this.base()}${path}`, {
				method,
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: body === undefined ? undefined : JSON.stringify(body),
				signal: AbortSignal.timeout(15000),
			});
		} catch {
			throw new ServiceUnavailableException({
				code: "RAHMAT_OUTCOME_UNKNOWN",
				message: "Payment outcome unknown; check status before retrying",
			});
		}
		const data = (await response.json()) as {
			success?: boolean;
			data: T;
			error?: { code?: string };
		};
		if (!response.ok || data.success !== true || !data.data) {
			if (response.status === 401) this.tokens.delete(purpose);
			throw new ServiceUnavailableException({
				code: data.error?.code || "RAHMAT_ERROR",
				message: "Rahmat request failed; check payment status",
			});
		}
		return data.data;
	}
	fiscal(purpose: RahmatPurpose, amount: number, name: string) {
		const p = this.prefix(purpose);
		return [
			{
				qty: 1,
				price: amount,
				total: amount,
				name,
				mxik: this.required(`${p}_MXIK`),
				package_code: this.required(`${p}_PACKAGE_CODE`),
				tin: this.required(`${p}_TIN`),
				vat: Number(this.value(`${p}_VAT`) || "0"),
			},
		];
	}
	callback(purpose: RahmatPurpose) {
		return `${this.required("RAHMAT_PUBLIC_API_URL").replace(/\/$/, "")}/webhooks/rahmat/${purpose.toLowerCase()}/success`;
	}
	returnUrl(purpose: RahmatPurpose, id: string) {
		const base = this.required(purpose === "TICKET" ? "MINI_APP_URL" : "ADMIN_APP_URL");
		return new URL(
			purpose === "TICKET" ? `/orders/${encodeURIComponent(id)}?pay=return` : "/billing/my",
			base,
		).toString();
	}
}
