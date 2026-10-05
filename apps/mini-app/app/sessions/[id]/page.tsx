import Link from "next/link";
import { GaBooking } from "../../../components/ga-booking";
import { SeatBooking } from "../../../components/seat-booking";
import { formatSessionDate, formatTime } from "../../../lib/format";
import { publicApi } from "../../../lib/server-api";
import type { SessionDetail } from "../../../lib/types";
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await publicApi<SessionDetail>(`/public/sessions/${id}`);
	const isGa = session.bookingMode === "GENERAL_ADMISSION" || session.seats.length === 0;
	return (
		<div className="seat-page">
			<div className="booking-heading">
				<Link href={`/movies/${session.movie.id}`} className="back" aria-label="Назад к фильму">
					←
				</Link>
				<div>
					<h1>{session.movie.title}</h1>
					<small>
						{formatSessionDate(session.startsAt)} · {formatTime(session.startsAt)} ·{" "}
						{session.hall.name}
					</small>
				</div>
			</div>
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
	);
}
