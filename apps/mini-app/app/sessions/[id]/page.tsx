import Image from "next/image";
import Link from "next/link";
import { Availability } from "../../../components/availability";
import { GaBooking } from "../../../components/ga-booking";
import { SeatBooking } from "../../../components/seat-booking";
import { formatSessionDate, formatTime } from "../../../lib/format";
import { publicApi } from "../../../lib/server-api";
import type { SessionDetail } from "../../../lib/types";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await publicApi<SessionDetail>(`/public/sessions/${id}`);
	const isGa = session.bookingMode === "GENERAL_ADMISSION" || session.seats.length === 0;
	const when = `${formatSessionDate(session.startsAt)} · ${formatTime(session.startsAt)} · ${session.hall.name}`;

	return (
		<>
			<div className="view-title">
				<Link href={`/movies/${session.movie.id}`} className="back" aria-label="Назад к фильму">
					←
				</Link>
				<h1>{isGa ? "Билеты без мест" : "Выберите места"}</h1>
			</div>
			<div className="pad">
				<div className="film-summary">
					{session.movie.posterUrl ? (
						<Image src={session.movie.posterUrl} alt="" width={45} height={63} unoptimized />
					) : (
						<div className="poster-fallback" />
					)}
					<div>
						<b>{session.movie.title}</b>
						<small>
							{session.cinema.name} · {when}
						</small>
					</div>
				</div>
				<Availability
					timeLabel={formatTime(session.startsAt)}
					remaining={session.remaining}
					capacity={session.hall.capacity}
				/>
				{isGa ? (
					<GaBooking
						sessionId={session.id}
						basePriceUzs={session.basePriceUzs}
						remaining={session.remaining}
					/>
				) : (
					<>
						<div className="screen-arc">ЭКРАН</div>
						<SeatBooking
							sessionId={session.id}
							seats={session.seats}
							basePriceUzs={session.basePriceUzs}
							remaining={session.remaining}
						/>
					</>
				)}
			</div>
		</>
	);
}
