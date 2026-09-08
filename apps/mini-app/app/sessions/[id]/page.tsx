import Link from "next/link";
import { GaBooking } from "../../../components/ga-booking";
import { SeatBooking } from "../../../components/seat-booking";
import { publicApi } from "../../../lib/api";
import { formatTime } from "../../../lib/format";
import type { SessionDetail } from "../../../lib/types";
import { cx, ui } from "../../../lib/ui";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await publicApi<SessionDetail>(`/public/sessions/${id}`);
	const isGa = session.bookingMode === "GENERAL_ADMISSION" || session.seats.length === 0;

	return (
		<>
			<div className="px-4 pt-[18px] pb-2">
				<Link
					href={`/movies/${session.movie.id}`}
					className={cx(ui.backFab, "relative mb-3")}
					aria-label="Назад"
				>
					←
				</Link>
				<h1 className="font-brand text-xl font-bold">
					{session.cinema.name} · {formatTime(session.startsAt)}
				</h1>
				<p className="mt-1 text-[13px] text-muted">
					{session.movie.title} · {session.hall.name} · {session.remaining} /{" "}
					{session.hall.capacity} мест
					{isGa ? " · без мест" : ""}
				</p>
			</div>
			{isGa ? (
				<GaBooking
					sessionId={session.id}
					basePriceUzs={session.basePriceUzs}
					remaining={session.remaining}
				/>
			) : (
				<>
					<div className="mx-6 mt-2 grid h-[34px] place-items-center rounded-t-[120px] border-2 border-b-0 border-orange/35 text-[10px] tracking-[0.2em] text-muted">
						ЭКРАН
					</div>
					<SeatBooking
						sessionId={session.id}
						seats={session.seats}
						basePriceUzs={session.basePriceUzs}
						remaining={session.remaining}
					/>
				</>
			)}
		</>
	);
}
