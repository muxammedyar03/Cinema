"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { hasRating, sixDayKeys } from "../lib/afisha";
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
	const days = useMemo(() => sixDayKeys(), []);
	const sessions = useMemo(
		() =>
			[...movie.sessions].sort(
				(a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
			),
		[movie.sessions],
	);
	const [day, setDay] = useState(() => {
		const first = sessions[0] ? dayKey(sessions[0].startsAt) : "";
		return days.includes(first) ? first : (days[0] ?? "");
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

				{cinema ? (
					<Link className="cinema-label" href={`/cinemas/${cinema.id}`}>
						{cinema.name} · О кинотеатре
					</Link>
				) : null}
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
					<details className="movie-description">
						<summary>О фильме</summary>
						<p className="description">{movie.description}</p>
					</details>
				) : null}
			</div>
		</>
	);
}
