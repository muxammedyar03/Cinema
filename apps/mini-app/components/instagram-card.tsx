"use client";

import { instagramEmbedSrc, instagramHandle } from "../lib/maps";
import { openExternalUrl } from "../lib/telegram";
import { cx, ui } from "../lib/ui";

export function InstagramCard({ url }: { url: string }) {
	const handle = instagramHandle(url);
	const embed = instagramEmbedSrc(url);
	if (!handle) return null;

	return (
		<section className="overflow-hidden rounded-2xl border border-line">
			<div className="flex items-center justify-between gap-2 px-3.5 py-3">
				<div>
					<p className="text-sm font-semibold">Instagram</p>
					<p className="text-[12px] text-muted">@{handle}</p>
				</div>
				<button
					type="button"
					className={cx(ui.cta, "h-9 px-3.5 text-xs")}
					onClick={() =>
						openExternalUrl(url.startsWith("http") ? url : `https://instagram.com/${handle}`)
					}
				>
					Открыть
				</button>
			</div>
			{embed ? (
				<iframe
					title={`Instagram @${handle}`}
					src={embed}
					className="h-[390px] w-full border-0 bg-white"
					loading="lazy"
				/>
			) : null}
		</section>
	);
}
