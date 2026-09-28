export type SeatStatusCount = Partial<Record<"AVAILABLE" | "HELD" | "SOLD" | "BLOCKED", number>>;

/**
 * Seated sessions: sold = SOLD seats, remaining = AVAILABLE seats.
 * General admission (no seat rows): sold = paid GA quantity,
 * remaining = capacity minus pending holds and paid GA.
 */
export function sessionSeatCounts(input: {
	capacity: number;
	byStatus: SeatStatusCount;
	gaSold: number;
	gaOccupied: number;
}): { sold: number; remaining: number } {
	const seatTotal =
		(input.byStatus.AVAILABLE ?? 0) +
		(input.byStatus.HELD ?? 0) +
		(input.byStatus.SOLD ?? 0) +
		(input.byStatus.BLOCKED ?? 0);
	if (seatTotal > 0) {
		return {
			sold: input.byStatus.SOLD ?? 0,
			remaining: input.byStatus.AVAILABLE ?? 0,
		};
	}
	return {
		sold: input.gaSold,
		remaining: Math.max(0, input.capacity - input.gaOccupied),
	};
}
