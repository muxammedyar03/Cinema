"use client";

import { mapEmbedSrc, mapExternalUrl } from "../lib/maps";
import { openExternalUrl } from "../lib/telegram";
import type { CinemaMap } from "../lib/types";

export function CinemaMapWidget({ map }: { map: CinemaMap }) {
	const label = map.provider === "yandex" ? "Яндекс Карты" : "Google Карты";
	return (
		<section className="venue-map">
			<iframe
				title={map.address || "Карта"}
				src={mapEmbedSrc(map.provider, map.lat, map.lng)}
				loading="lazy"
				referrerPolicy="no-referrer-when-downgrade"
			/>
			<div className="venue-map-caption">
				<span>{map.address || `${map.lat}, ${map.lng}`}</span>
				<button
					type="button"
					onClick={() => openExternalUrl(mapExternalUrl(map.provider, map.lat, map.lng))}
				>
					{label}
				</button>
			</div>
		</section>
	);
}
