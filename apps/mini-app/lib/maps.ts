export function mapEmbedSrc(provider: "google" | "yandex", lat: number, lng: number): string {
	if (provider === "yandex") {
		return `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=16&pt=${lng},${lat},pm2rdm&l=map`;
	}
	return `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=ru&output=embed`;
}

export function mapExternalUrl(provider: "google" | "yandex", lat: number, lng: number): string {
	if (provider === "yandex") {
		return `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
	}
	return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function instagramHandle(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		const parsed = new URL(
			url.startsWith("http") ? url : `https://www.instagram.com/${url.replace(/^@/, "")}/`,
		);
		const handle = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
		return handle || null;
	} catch {
		return null;
	}
}

export function instagramEmbedSrc(url: string): string | null {
	const handle = instagramHandle(url);
	return handle ? `https://www.instagram.com/${handle}/embed` : null;
}

export function telegramHref(contact: string): string {
	const user = contact.replace(/^@/, "");
	return `https://t.me/${user}`;
}
