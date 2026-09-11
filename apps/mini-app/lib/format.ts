const TZ = "Asia/Tashkent";
const LOCALE = "ru-RU";

export function formatPrice(uzs: number): string {
	return `${uzs.toLocaleString(LOCALE)} сум`;
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(LOCALE, {
		timeZone: TZ,
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDayLabel(dateKey: string): string {
	const d = new Date(`${dateKey}T12:00:00+05:00`);
	return d.toLocaleDateString(LOCALE, {
		timeZone: TZ,
		weekday: "short",
		day: "numeric",
		month: "short",
	});
}

export function formatCountdown(ms: number): string {
	if (ms <= 0) return "00:00";
	const total = Math.floor(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h <= 0) return `${m} мин`;
	return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function posterGradient(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	const hue = Math.abs(hash) % 360;
	return `linear-gradient(145deg, hsl(${hue} 55% 28%), hsl(${(hue + 40) % 360} 70% 14%) 55%, #0a0a0a)`;
}
