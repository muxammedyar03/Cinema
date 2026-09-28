export function Availability({
	timeLabel,
	remaining,
	capacity,
}: {
	timeLabel?: string;
	remaining: number;
	capacity: number;
}) {
	const pct = capacity > 0 ? Math.max(0, Math.min(100, (remaining / capacity) * 100)) : 0;
	return (
		<div className="availability" aria-live="polite">
			<div className="availability-row">
				<span>{timeLabel ? `Свободно на ${timeLabel}` : "Свободно"}</span>
				<strong>
					{remaining} из {capacity} мест
				</strong>
			</div>
			<div className="availability-track" aria-hidden="true">
				<i style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}
