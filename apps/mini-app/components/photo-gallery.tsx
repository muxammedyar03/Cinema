"use client";

import Image from "next/image";
import { useState } from "react";
import type { CinemaPhoto } from "../lib/types";
import { cx } from "../lib/ui";

export function PhotoGallery({ photos }: { photos: CinemaPhoto[] }) {
	const ordered = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
	const [active, setActive] = useState(0);
	if (ordered.length === 0) return null;
	const current = ordered[active] ?? ordered[0];
	if (!current) return null;

	return (
		<section>
			<div className="relative overflow-hidden rounded-2xl border border-line">
				<Image
					src={current.url}
					alt=""
					width={720}
					height={420}
					unoptimized
					className="h-[210px] w-full object-cover"
				/>
			</div>
			{ordered.length > 1 ? (
				<div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
					{ordered.map((photo, i) => (
						<button
							key={photo.id}
							type="button"
							className={cx(
								"h-14 w-[72px] shrink-0 overflow-hidden rounded-xl border",
								i === active ? "border-orange" : "border-line",
							)}
							onClick={() => setActive(i)}
						>
							<Image
								src={photo.url}
								alt=""
								width={72}
								height={56}
								unoptimized
								className="h-full w-full object-cover"
							/>
						</button>
					))}
				</div>
			) : null}
		</section>
	);
}
