"use client";

import { Dialog } from "@cinema/ui";
import Image from "next/image";
import { useState } from "react";
import type { CinemaPhoto } from "../lib/types";

export function PhotoGallery({ photos }: { photos: CinemaPhoto[] }) {
	const ordered = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
	const [open, setOpen] = useState<CinemaPhoto | null>(null);
	if (ordered.length === 0) return null;

	const caption = open?.caption?.trim() || "";

	return (
		<>
			<div className="venue-gallery">
				{ordered.map((photo) => (
					<button key={photo.id} type="button" onClick={() => setOpen(photo)}>
						<Image
							src={photo.url}
							alt={photo.caption?.trim() || "Фото кинотеатра"}
							width={640}
							height={360}
							unoptimized
						/>
						{photo.caption?.trim() ? <small>{photo.caption}</small> : null}
					</button>
				))}
			</div>
			<Dialog open={open != null} title="Фото кинотеатра" onClose={() => setOpen(null)}>
				{open ? (
					<>
						<Image
							className="dialog-photo"
							src={open.url}
							alt={caption || "Фото кинотеатра"}
							width={960}
							height={640}
							unoptimized
						/>
						{caption ? <p className="dialog-caption">{caption}</p> : null}
					</>
				) : null}
			</Dialog>
		</>
	);
}
