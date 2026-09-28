import type { BadgeTone } from "@cinema/ui";
import type { CinemaListItem, CinemaStatus, InvoiceListItem } from "./types";

const MONTHS = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
] as const;

const STEP_LABELS: Record<string, string> = {
	photos: "фото",
	location: "локация",
	instagram: "Instagram",
	phones: "телефоны",
	telegramContact: "Telegram",
	securityEmail: "почта для входа",
};

export function formatMoneyUzs(amount: number): string {
	return `${new Intl.NumberFormat("ru-RU").format(amount)} сум`;
}

export function formatPeriod(year: number, month: number): string {
	const name = MONTHS[month - 1];
	if (!name || !Number.isInteger(year)) return "—";
	return `${name} ${year}`;
}

export function formatDueDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" });
}

export function activeCinemasHint(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	const word = mod10 === 1 && mod100 !== 11 ? "активный" : "активных";
	return `${count} ${word}`;
}

export function cinemaStatusLabel(
	item: Pick<CinemaListItem, "status" | "profileComplete">,
): string {
	if (item.profileComplete === false) return "Ожидает подключения";
	return cinemaOperationalLabel(item.status);
}

export function cinemaStatusTone(
	item: Pick<CinemaListItem, "status" | "profileComplete">,
): BadgeTone {
	if (item.profileComplete === false) return "warn";
	if (item.status === "ACTIVE") return "ok";
	if (item.status === "LOCKED") return "bad";
	return "neutral";
}

export function cinemaOperationalLabel(status: CinemaStatus): string {
	if (status === "ACTIVE") return "Активен";
	if (status === "DISABLED") return "Отключён";
	return "Заблокирован";
}

export function invoiceStatusLabel(status: string): string {
	if (status === "PAID") return "Оплачен";
	if (status === "DUE") return "Ожидает оплаты";
	if (status === "OVERDUE") return "Просрочен";
	if (status === "VOID") return "Аннулирован";
	return "—";
}

export function invoiceStatusTone(status: string): BadgeTone {
	if (status === "PAID") return "ok";
	if (status === "OVERDUE") return "bad";
	if (status === "DUE") return "warn";
	return "neutral";
}

export function roleLabel(role: string): string {
	if (role === "CINEMA_ADMIN") return "Администратор";
	if (role === "STAFF") return "Контроль входа";
	if (role === "SUPER_ADMIN") return "Суперадминистратор";
	return "—";
}

export function personName(first: string | null, last: string | null): string {
	const name = [first, last]
		.map((part) => part?.trim() ?? "")
		.filter(Boolean)
		.join(" ");
	return name || "—";
}

export function profileMissingLabel(missing: string[]): string {
	const labels = missing.map((step) => STEP_LABELS[step] ?? "").filter(Boolean);
	return labels.join(", ");
}

export function adminStatusView(admin: {
	profileComplete: boolean | null;
	billingStatus: string | null;
}): { label: string; tone: BadgeTone } | null {
	if (admin.profileComplete === false) {
		return { label: "Ожидает подключения", tone: "warn" };
	}
	if (!admin.billingStatus) return null;
	const label = invoiceStatusLabel(admin.billingStatus);
	if (label === "—") return null;
	return { label, tone: invoiceStatusTone(admin.billingStatus) };
}

/** One unlock control per locked cinema, on the first invoice row. */
export function unlockRowIds(
	rows: Pick<InvoiceListItem, "id" | "cinemaId" | "cinemaStatus">[],
): Set<string> {
	const seen = new Set<string>();
	const ids = new Set<string>();
	for (const row of rows) {
		if (row.cinemaStatus !== "LOCKED" || seen.has(row.cinemaId)) continue;
		seen.add(row.cinemaId);
		ids.add(row.id);
	}
	return ids;
}

export function showCityColumn(rows: Pick<CinemaListItem, "city">[]): boolean {
	return rows.some((row) => Boolean(row.city));
}
