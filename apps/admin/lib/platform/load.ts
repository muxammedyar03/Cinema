import { cookies } from "next/headers";
import {
	parseCinemaDossier,
	parseCinemaList,
	parseInvoiceList,
	parsePlatformAdmins,
	parsePlatformSummary,
	parseProfileBanner,
} from "./parse";
import { classifyExistingEndpoint, classifyNewEndpoint } from "./state";
import type { ApiResult, CinemaDossier, LoadState, ProfileBanner } from "./types";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function readApi(path: string): Promise<ApiResult> {
	try {
		const jar = await cookies();
		const res = await fetch(`${API}${path}`, {
			headers: { cookie: jar.toString() },
			cache: "no-store",
		});
		const text = await res.text();
		if (!text) return { status: res.status, body: null };
		try {
			return { status: res.status, body: JSON.parse(text) as unknown };
		} catch {
			return { status: res.status, body: null };
		}
	} catch {
		return { status: 0, body: null };
	}
}

export async function loadPlatformSummary() {
	const result = await readApi("/admin/platform/summary");
	return classifyNewEndpoint(result, parsePlatformSummary, "Не удалось загрузить сводку платформы");
}

export async function loadCinemas() {
	const result = await readApi("/admin/cinemas");
	return classifyExistingEndpoint(result, parseCinemaList, "Не удалось загрузить кинотеатры");
}

export async function loadPlatformAdmins(cursor?: string) {
	const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
	const result = await readApi(`/admin/platform/admins${query}`);
	return classifyNewEndpoint(result, parsePlatformAdmins, "Не удалось загрузить администраторов");
}

export async function loadInvoices() {
	const result = await readApi("/admin/billing/invoices");
	return classifyExistingEndpoint(result, parseInvoiceList, "Не удалось загрузить счета");
}

export async function loadCinemaDossier(
	id: string,
): Promise<LoadState<{ dossier: CinemaDossier; profile: ProfileBanner | null }>> {
	const [dossierResult, profileResult] = await Promise.all([
		readApi(`/admin/cinemas/${id}/dossier`),
		readApi(`/admin/cinemas/${id}/profile`),
	]);
	const dossier = classifyExistingEndpoint(
		dossierResult,
		parseCinemaDossier,
		"Не удалось загрузить кинотеатр",
	);
	if (dossier.status !== "ready") return dossier;
	const profile =
		profileResult.status >= 200 && profileResult.status < 300
			? parseProfileBanner(profileResult.body)
			: null;
	return { status: "ready", data: { dossier: dossier.data, profile } };
}
