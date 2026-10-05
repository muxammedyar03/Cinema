"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { hasRating } from "../lib/afisha";
import { formatMinutes, formatPrice, formatTime } from "../lib/format";
import type { MovieDetail, PublicCinemaProfile } from "../lib/types";
import { BookingAction } from "./booking-action";

import { DateStrip } from "./date-strip";

import { SessionChip } from "./session-chip";

function dayKey(iso: string): string {
	return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
}

export function MovieScreen({
	movie,
	cinemas,
}: {
	movie: MovieDetail;
	cinemas: PublicCinemaProfile[];
}) {
	const router = useRouter();
	const sessions = useMemo(
		() =>
			movie.sessions
				.filter((session) => new Date(session.startsAt).getTime() >= Date.now())
				.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
		[movie.sessions],
	);
	const days = useMemo(
		() => [...new Set(sessions.map((session) => dayKey(session.startsAt)))],
		[sessions],
	);
	const [day, setDay] = useState(() => {
		return days[0] ?? "";
	});
	const daySessions = sessions.filter((session) => dayKey(session.startsAt) === day);
	const [sessionId, setSessionId] = useState(daySessions[0]?.id ?? sessions[0]?.id ?? "");
	const selected =
		daySessions.find((session) => session.id === sessionId) ?? daySessions[0] ?? null;
	const cinema = selected ? cinemas.find((item) => item.id === selected.cinemaId) : cinemas[0];
	const genres = (movie.genres ?? []).map((genre) => genre.trim()).filter(Boolean);

	function selectDay(next: string) {
		setDay(next);
		const first = sessions.find((session) => dayKey(session.startsAt) === next);
		setSessionId(first?.id ?? "");
	}

	return (
		<>
			<div className="detail-poster">
				{movie.posterUrl ? (
					<Image src={movie.posterUrl} alt={movie.title} fill unoptimized sizes="480px" priority />
				) : (
					<div className="detail-fallback" />
				)}
				<Link href="/" className="back" aria-label="Назад к афише">
					←
				</Link>
			</div>
			<div className="detail-copy">
				<h1>{movie.title}</h1>
				<div className="meta">
					{hasRating(movie.rating) ? <strong>★ {movie.rating.toFixed(1)}</strong> : null}
					{genres.map((genre) => (
						<span key={genre}>{genre}</span>
					))}
					<span>{formatMinutes(movie.durationMin)}</span>
					{movie.ageRating ? <span>{movie.ageRating}</span> : null}
				</div>

				<h2>Выберите сеанс</h2>
			</div>
			<DateStrip days={days} active={day} onSelect={selectDay} />
			<div className="pad">
				{selected ? (
					<div className="cinema-label">
						<b>{selected.cinemaName}</b>
						<span>{selected.hallName}</span>
					</div>
				) : null}
				{daySessions.length === 0 ? (
					<p className="note">На эту дату сеансов нет.</p>
				) : (
					<div className="times">
						{daySessions.map((session) => (
							<SessionChip
								key={session.id}
								session={session}
								active={session.id === selected?.id}
								onSelect={() => setSessionId(session.id)}
							/>
						))}
					</div>
				)}
				{selected ? (
					<BookingAction
						summary={`${formatTime(selected.startsAt)} · от ${formatPrice(selected.basePriceUzs)}`}
						label="Выбрать места"
						disabled={selected.remaining <= 0}
						onClick={() => router.push(`/sessions/${selected.id}`)}
					/>
				) : null}
				{movie.description ? (
					<section className="movie-description">
						<h2>О фильме</h2>
						<p className="description">{movie.description}</p>
					</section>
				) : null}
				{cinema ? (
					<Link className="cinema-profile-link" href={`/cinemas/${cinema.id}`}>
						<span>
							<b>{cinema.name}</b>
							{cinema.address ? ` · ${cinema.address}` : ""}
						</span>
						<span>О кинотеатре →</span>
					</Link>
				) : null}
			</div>
		</>
	);
}
