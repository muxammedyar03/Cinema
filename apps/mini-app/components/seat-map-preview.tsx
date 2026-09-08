import type { SessionSeat } from "../lib/types";
import { cx, ui } from "../lib/ui";

const SEAT = 28;

const seatBase =
	"absolute grid place-items-center rounded-[7px] border border-white/20 bg-transparent font-ui text-[8px] font-semibold text-[#ddd]";

const seatByType: Record<string, string> = {
	vip: "border-orange/55 text-orange",
};

const seatByStatus: Record<string, string> = {
	held: "border-[#2a2a2a] bg-[#2a2a2a] text-[#666]",
	sold: "border-[#2a2a2a] bg-[#2a2a2a] text-[#666]",
	blocked: "border-[#161616] bg-[#161616] text-[#444]",
};

export function SeatMapPreview({ seats }: { seats: SessionSeat[] }) {
	if (seats.length === 0) {
		return <p className={ui.empty}>Для этого сеанса нет карты мест.</p>;
	}
	const maxX = Math.max(...seats.map((s) => s.x + SEAT), 320);
	const maxY = Math.max(...seats.map((s) => s.y + SEAT), 240);
	const scale = Math.min(1, 360 / maxX);

	return (
		<div className="max-h-[52vh] overflow-auto px-3 pt-3 pb-5">
			<div
				className="relative mx-auto origin-top-left"
				style={{ width: maxX * scale, height: maxY * scale }}
			>
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
						const status = seat.status.toLowerCase();
						const type = seat.type.toLowerCase();
						return (
							<div
								key={seat.id}
								className={cx(seatBase, seatByType[type], seatByStatus[status])}
								style={{
									left: seat.x,
									top: seat.y,
									width: SEAT,
									height: SEAT,
									transform: `rotate(${seat.rotation}deg)`,
								}}
								title={`${seat.rowLabel}${seat.number} · ${seat.status}`}
							>
								{seat.rowLabel}
								{seat.number}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
