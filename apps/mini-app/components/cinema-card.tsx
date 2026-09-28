import { Card } from "@cinema/ui";
import { cinemaBlurb } from "../lib/afisha";
import type { PublicCinemaProfile } from "../lib/types";
import { LinkButton } from "./link-button";
import { PhotoGallery } from "./photo-gallery";

export function CinemaCard({ cinema }: { cinema: PublicCinemaProfile }) {
	const blurb = cinemaBlurb(cinema);
	const initial = cinema.name.trim().charAt(0).toUpperCase() || "К";
	return (
		<Card>
			<div className="cinema-card-inner">
				<div className="cinema-card-header">
					<div className="cinema-avatar" aria-hidden="true">
						{initial}
					</div>
					<div className="cinema-card-copy">
						<b>{cinema.name}</b>
						{blurb ? <small>{blurb}</small> : null}
					</div>
					<LinkButton href={`/cinemas/${cinema.id}`} variant="secondary" size="small">
						Открыть
					</LinkButton>
				</div>
				{cinema.photos.length > 0 ? <PhotoGallery photos={cinema.photos} /> : null}
				{cinema.address ? <span className="venue-location">{cinema.address}</span> : null}
			</div>
		</Card>
	);
}
