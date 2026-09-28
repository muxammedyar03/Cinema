export function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

export function pct(rate: number | null) {
	if (rate == null) return "—";
	return `${(rate * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
}

export function periodLabel(range: "daily" | "weekly") {
	return range === "weekly" ? "за 8 недель" : "за 7 дней";
}

export function ruCount(n: number, one: string, few: string, many: string) {
	const abs = Math.abs(n) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return many;
	if (last > 1 && last < 5) return few;
	if (last === 1) return one;
	return many;
}

export function tashkentDate(iso: string, withTime = false) {
	return new Date(iso).toLocaleString("ru-RU", {
		timeZone: "Asia/Tashkent",
		day: "numeric",
		month: "short",
		...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
	});
}

export function tashkentTime(iso: string) {
	return new Date(iso).toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Tashkent",
	});
}
