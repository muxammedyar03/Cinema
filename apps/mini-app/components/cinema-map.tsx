"use client";

import { mapEmbedSrc, mapExternalUrl } from "../lib/maps";
import { openExternalUrl } from "../lib/telegram";
import type { CinemaMap } from "../lib/types";
import { cx } from "../lib/ui";

export function CinemaMapWidget({ map }: { map: CinemaMap }) {
	return (
		<section className="overflow-hidden rounded-2xl border border-line">
			<iframe
				title={map.address || "Карта"}
				src={mapEmbedSrc(map.provider, map.lat, map.lng)}
				className="h-[210px] w-full border-0"
				loading="lazy"
				referrerPolicy="no-referrer-when-downgrade"
			/>
			<div className="flex items-center justify-between gap-2 px-3 py-2.5">
				<p className="truncate text-[12px] text-muted">{map.address || `${map.lat}, ${map.lng}`}</p>
				<button
					type="button"
					className={cx("shrink-0 text-[12px] font-semibold text-orange")}
					onClick={() => openExternalUrl(mapExternalUrl(map.provider, map.lat, map.lng))}
				>
					{map.provider === "yandex" ? "Yandex" : "Google"}
				</button>
			</div>
		</section>
	);
}
