import type { MapProvider } from "@cinema/types";

export function mapEmbedSrc(provider: MapProvider, lat: number, lng: number): string {
	if (provider === "yandex") {
		return `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=16&pt=${lng},${lat},pm2rdm&l=map`;
	}
	return `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=ru&output=embed`;
}

export function mapExternalUrl(provider: MapProvider, lat: number, lng: number): string {
	if (provider === "yandex") {
		return `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
	}
	return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function parseMapsPaste(text: string): { lat: number; lng: number } | null {
	const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
	if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
	const query = text.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
	if (query) {
		const a = Number(query[1]);
		const b = Number(query[2]);
		if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
		if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lng: a };
	}
	const pair = text.match(/(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)/);
	if (pair) {
		const lat = Number(pair[1]);
		const lng = Number(pair[2]);
		if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
	}
	return null;
}
