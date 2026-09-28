"use client";

import { Button, Card } from "@cinema/ui";
import { instagramEmbedSrc, instagramHandle } from "../lib/maps";
import { openExternalUrl } from "../lib/telegram";

export function InstagramCard({ url }: { url: string }) {
	const handle = instagramHandle(url);
	const embed = instagramEmbedSrc(url);
	if (!handle) return null;
	const href = url.startsWith("http") ? url : `https://instagram.com/${handle}`;

	return (
		<Card>
			<div className="ig-head">
				<div>
					<p>Instagram</p>
					<p className="meta-line">@{handle}</p>
				</div>
				<Button type="button" size="small" onClick={() => openExternalUrl(href)}>
					Открыть
				</Button>
			</div>
			{embed ? (
				<iframe title={`Instagram @${handle}`} src={embed} className="ig-frame" loading="lazy" />
			) : null}
		</Card>
	);
}
