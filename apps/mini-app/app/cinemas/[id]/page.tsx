import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CinemaMapWidget } from "../../../components/cinema-map";
import { FollowButton } from "../../../components/follow-button";
import { InstagramCard } from "../../../components/instagram-card";
import { PhotoGallery } from "../../../components/photo-gallery";
import { publicApi } from "../../../lib/api";
import { instagramHandle, telegramHref } from "../../../lib/maps";
import type { PublicCinemaProfile } from "../../../lib/types";
import { cx, ui } from "../../../lib/ui";

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

	return (
		<div className="px-[18px] pt-[18px] pb-8">
			<Link href="/" className={cx(ui.backFab, "relative mb-4")} aria-label="Назад">
				←
			</Link>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<h1 className="font-brand text-[26px] font-extrabold tracking-tight">{cinema.name}</h1>
					{cinema.address ? <p className="mt-1 text-[13px] text-muted">{cinema.address}</p> : null}
				</div>
			</div>

			<FollowButton
				cinemaId={cinema.id}
				initialFollowing={cinema.followedByMe}
				initialCount={cinema.followerCount}
			/>

			{cinema.description ? (
				<p className="mt-4 text-sm leading-relaxed text-muted">{cinema.description}</p>
			) : null}

			<div className="mt-5 grid gap-4">
				{cinema.photos.length ? <PhotoGallery photos={cinema.photos} /> : null}
				{cinema.map ? <CinemaMapWidget map={cinema.map} /> : null}
				{cinema.instagramUrl ? <InstagramCard url={cinema.instagramUrl} /> : null}

				{(cinema.phones.length || cinema.telegramContact) && (
					<section className="rounded-2xl border border-line px-3.5 py-3 text-[13px]">
						<p className="mb-2 text-sm font-semibold">Контакты</p>
						{cinema.phones.map((phone) => (
							<p key={phone} className="text-muted">
								<a href={`tel:${phone}`}>{phone}</a>
							</p>
						))}
						{cinema.telegramContact ? (
							<p className="mt-1">
								<a
									className="font-semibold text-orange"
									href={telegramHref(cinema.telegramContact)}
								>
									{cinema.telegramContact}
								</a>
							</p>
						) : null}
						{ig ? <p className="mt-1 text-muted">Instagram @{ig}</p> : null}
					</section>
				)}
			</div>
		</div>
	);
}
