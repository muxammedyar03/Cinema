import type { SessionSeat } from "../lib/types";
import { cx } from "../lib/ui";

const SEAT = 28;

export function SeatMapPreview({ seats }: { seats: SessionSeat[] }) {
	if (seats.length === 0) {
		return <p className="note">Для этого сеанса нет карты мест.</p>;
	}
	const maxX = Math.max(...seats.map((seat) => seat.x + SEAT), 320);
	const maxY = Math.max(...seats.map((seat) => seat.y + SEAT), 240);
	const scale = Math.min(1, 360 / maxX);

	return (
		<div className="seat-viewport" style={{ height: maxY * scale + 24 }}>
			<div
				style={{
					transform: `scale(${scale})`,
					transformOrigin: "top left",
					width: maxX,
					height: maxY,
					position: "relative",
				}}
			>
				{seats.map((seat) => {
					const taken =
						seat.status === "HELD" || seat.status === "SOLD" || seat.status === "BLOCKED";
					const vip = seat.type === "VIP";
					return (
						<div
							key={seat.id}
							className={cx("seat", taken && "seat-taken", vip && !taken && "seat-vip")}
							style={{
								left: seat.x,
								top: seat.y,
								width: SEAT,
								height: SEAT,
								transform: `rotate(${seat.rotation}deg)`,
							}}
							title={`${seat.rowLabel}${seat.number}`}
						>
							{seat.number}
						</div>
					);
				})}
			</div>
		</div>
	);
}
