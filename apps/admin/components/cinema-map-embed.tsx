import type { MapProvider } from "@cinema/types";
import { mapEmbedSrc, mapExternalUrl } from "../lib/maps";
import { cx } from "../lib/ui";

export function CinemaMapEmbed({
	provider,
	lat,
	lng,
	address,
	className,
}: {
	provider: MapProvider;
	lat: number;
	lng: number;
	address?: string | null;
	className?: string;
}) {
	return (
		<div className={cx("overflow-hidden rounded-xl border border-line", className)}>
			<iframe
				title={address || "Карта кинотеатра"}
				src={mapEmbedSrc(provider, lat, lng)}
				className="h-[220px] w-full border-0"
				loading="lazy"
				referrerPolicy="no-referrer-when-downgrade"
			/>
			<div className="flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-muted">
				<span className="truncate">{address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</span>
				<a
					className="shrink-0 font-semibold text-orange"
					href={mapExternalUrl(provider, lat, lng)}
					target="_blank"
					rel="noreferrer"
				>
					Открыть
				</a>
			</div>
		</div>
	);
}
