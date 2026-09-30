import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CinemaMapWidget } from "../../../components/cinema-map";
import { FollowButton } from "../../../components/follow-button";
import { InstagramCard } from "../../../components/instagram-card";
import { PhotoGallery } from "../../../components/photo-gallery";
import { instagramHandle, telegramHref } from "../../../lib/maps";
import { publicApi } from "../../../lib/server-api";
import type { PublicCinemaProfile } from "../../../lib/types";

export default async function CinemaPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	let cinema: PublicCinemaProfile;
	try {
		const jar = await cookies();
		cinema = await publicApi<PublicCinemaProfile>(`/public/cinemas/${id}`, {
			headers: { cookie: jar.toString() },
		});
	} catch {
		notFound();
	}
	const ig = instagramHandle(cinema.instagramUrl);
	const place = [cinema.city, cinema.address].filter(Boolean).join(" · ");

	return (
		<div className="venue-page">
			<Link href="/" className="back back-gap" aria-label="Назад к афише">
				←
			</Link>
			<h1>{cinema.name}</h1>
			{place ? <p className="venue-location">{place}</p> : null}
			<div style={{ marginTop: 16 }}>
				<FollowButton
					cinemaId={cinema.id}
					initialFollowing={cinema.followedByMe}
					initialCount={cinema.followerCount}
				/>
			</div>
			{cinema.description ? <p className="venue-lead">{cinema.description}</p> : null}
			{cinema.photos.length > 0 ? <PhotoGallery photos={cinema.photos} /> : null}
			{cinema.map ? <CinemaMapWidget map={cinema.map} /> : null}
			{cinema.instagramUrl ? <InstagramCard url={cinema.instagramUrl} /> : null}
			{cinema.phones.length > 0 || cinema.telegramContact ? (
				<section className="contact-card">
					<p className="section-label">Контакты</p>
					{cinema.phones.map((phone) => (
						<p key={phone}>
							<a href={`tel:${phone}`}>{phone}</a>
						</p>
					))}
					{cinema.telegramContact ? (
						<p>
							<a href={telegramHref(cinema.telegramContact)}>{cinema.telegramContact}</a>
						</p>
					) : null}
					{ig ? <p>Instagram @{ig}</p> : null}
				</section>
			) : null}
		</div>
	);
}
