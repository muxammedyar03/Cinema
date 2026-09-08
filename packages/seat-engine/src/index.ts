export type SeatType = "STANDARD" | "VIP" | "BLOCKED";

export type EngineSeat = {
	id: string;
	rowLabel: string;
	number: number;
	type: SeatType;
	x: number;
	y: number;
	rotation: number;
};

export type HallSpec = {
	canvasWidth: number;
	canvasHeight: number;
	seats: EngineSeat[];
};

export type Bounds = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	width: number;
	height: number;
};

/** even = bir xil oraliq; pairs = 2 ta yaqin, keyin kengroq yo‘lak */
export type SpacingPattern = "even" | "pairs";

export type ArrangeRowOptions = {
	startX: number;
	y: number;
	seatGap: number;
	groupGap: number;
	pattern: SpacingPattern;
	pairSize?: number;
	canvasWidth: number;
	canvasHeight: number;
	/** agar true bo‘lsa number 1..n qayta beriladi */
	renumber?: boolean;
};

/** Matches layoutSchema seat footprint (seat must stay inside canvas - 32). */
export const SEAT_SIZE = 32;
export const GRID_SNAP = 8;
export const HIT_PAD = 4;
export const DEFAULT_SEAT_GAP = 8;
export const DEFAULT_GROUP_GAP = 24;

export function snap(value: number, grid = GRID_SNAP): number {
	return Math.round(value / grid) * grid;
}

export function clampSeatPosition(
	x: number,
	y: number,
	canvasWidth: number,
	canvasHeight: number,
): { x: number; y: number } {
	return {
		x: Math.max(0, Math.min(x, canvasWidth - SEAT_SIZE)),
		y: Math.max(0, Math.min(y, canvasHeight - SEAT_SIZE)),
	};
}

export const MAGNET_THRESHOLD = 14;

export type MagnetGuide = {
	v: number | null;
	h: number | null;
};

export function selectionBounds(seats: EngineSeat[]): Bounds {
	return bounds({ canvasWidth: 0, canvasHeight: 0, seats });
}

/** Keep a group's bounding box inside the canvas. */
export function clampGroupDelta(
	box: Bounds,
	dx: number,
	dy: number,
	canvasWidth: number,
	canvasHeight: number,
): { dx: number; dy: number } {
	if (box.width <= 0 || box.height <= 0) return { dx, dy };
	return {
		dx: Math.max(-box.minX, Math.min(dx, canvasWidth - box.maxX)),
		dy: Math.max(-box.minY, Math.min(dy, canvasHeight - box.maxY)),
	};
}

function closestMagnet(value: number, targets: number[], threshold: number): number | null {
	let best: number | null = null;
	let bestDist = threshold;
	for (const target of targets) {
		const dist = Math.abs(value - target);
		if (dist <= bestDist) {
			best = target;
			bestDist = dist;
		}
	}
	return best;
}

/**
 * Pull a moving selection to canvas center / edges (Figma-style).
 * `dx`/`dy` are already applied in the caller's proposed box movement.
 */
export function magnetDelta(
	box: Bounds,
	dx: number,
	dy: number,
	canvasWidth: number,
	canvasHeight: number,
	threshold = MAGNET_THRESHOLD,
): { dx: number; dy: number; guides: MagnetGuide } {
	const next = {
		minX: box.minX + dx,
		maxX: box.maxX + dx,
		minY: box.minY + dy,
		maxY: box.maxY + dy,
	};
	const nextCx = (next.minX + next.maxX) / 2;
	const nextCy = (next.minY + next.maxY) / 2;
	const canvasCx = canvasWidth / 2;
	const canvasCy = canvasHeight / 2;

	let outDx = dx;
	let outDy = dy;
	let v: number | null = null;
	let h: number | null = null;

	const snapX = closestMagnet(nextCx, [canvasCx], threshold);
	const snapLeft = closestMagnet(next.minX, [0], threshold);
	const snapRight = closestMagnet(next.maxX, [canvasWidth], threshold);
	if (snapX !== null) {
		outDx += snapX - nextCx;
		v = snapX;
	} else if (snapLeft !== null) {
		outDx += snapLeft - next.minX;
		v = snapLeft;
	} else if (snapRight !== null) {
		outDx += snapRight - next.maxX;
		v = snapRight;
	}

	const snapY = closestMagnet(nextCy, [canvasCy], threshold);
	const snapTop = closestMagnet(next.minY, [0], threshold);
	const snapBottom = closestMagnet(next.maxY, [canvasHeight], threshold);
	if (snapY !== null) {
		outDy += snapY - nextCy;
		h = snapY;
	} else if (snapTop !== null) {
		outDy += snapTop - next.minY;
		h = snapTop;
	} else if (snapBottom !== null) {
		outDy += snapBottom - next.maxY;
		h = snapBottom;
	}

	return { dx: outDx, dy: outDy, guides: { v, h } };
}

export function centerSelectionDelta(
	box: Bounds,
	axis: "x" | "y" | "both",
	canvasWidth: number,
	canvasHeight: number,
): { dx: number; dy: number } {
	const cx = (box.minX + box.maxX) / 2;
	const cy = (box.minY + box.maxY) / 2;
	const dx = axis === "y" ? 0 : canvasWidth / 2 - cx;
	const dy = axis === "x" ? 0 : canvasHeight / 2 - cy;
	return clampGroupDelta(box, dx, dy, canvasWidth, canvasHeight);
}

export function bounds(spec: HallSpec): Bounds {
	if (spec.seats.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const seat of spec.seats) {
		minX = Math.min(minX, seat.x);
		minY = Math.min(minY, seat.y);
		maxX = Math.max(maxX, seat.x + SEAT_SIZE);
		maxY = Math.max(maxY, seat.y + SEAT_SIZE);
	}
	return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Top-most seat under point wins (last painted / last in array). */
export function hitTest(spec: HallSpec, x: number, y: number): string | null {
	for (let i = spec.seats.length - 1; i >= 0; i--) {
		const seat = spec.seats[i];
		if (
			x >= seat.x - HIT_PAD &&
			x <= seat.x + SEAT_SIZE + HIT_PAD &&
			y >= seat.y - HIT_PAD &&
			y <= seat.y + SEAT_SIZE + HIT_PAD
		) {
			return seat.id;
		}
	}
	return null;
}

export function seatsInRect(
	spec: HallSpec,
	rect: { x1: number; y1: number; x2: number; y2: number },
): string[] {
	const left = Math.min(rect.x1, rect.x2);
	const right = Math.max(rect.x1, rect.x2);
	const top = Math.min(rect.y1, rect.y2);
	const bottom = Math.max(rect.y1, rect.y2);
	return spec.seats
		.filter(
			(s) => s.x + SEAT_SIZE >= left && s.x <= right && s.y + SEAT_SIZE >= top && s.y <= bottom,
		)
		.map((s) => s.id);
}

export function nextSeatNumber(seats: EngineSeat[], rowLabel: string): number {
	let max = 0;
	for (const seat of seats) {
		if (seat.rowLabel === rowLabel) {
			max = Math.max(max, seat.number);
		}
	}
	return max + 1;
}

const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function nextRowLabel(seats: EngineSeat[]): string {
	const used = new Set(seats.map((s) => s.rowLabel));
	for (const letter of ROW_LETTERS) {
		if (!used.has(letter)) {
			return letter;
		}
	}
	let i = 1;
	while (used.has(`R${i}`)) {
		i += 1;
	}
	return `R${i}`;
}

export function createLocalId(): string {
	return `local_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSeat(
	partial: Omit<EngineSeat, "id" | "rotation"> & { id?: string; rotation?: number },
): EngineSeat {
	return {
		id: partial.id ?? createLocalId(),
		rowLabel: partial.rowLabel,
		number: partial.number,
		type: partial.type,
		x: partial.x,
		y: partial.y,
		rotation: partial.rotation ?? 0,
	};
}

/** Relative x offsets from start for each seat index. */
export function seatXOffsets(
	count: number,
	opts: {
		seatGap: number;
		groupGap: number;
		pattern: SpacingPattern;
		pairSize?: number;
	},
): number[] {
	const pairSize = Math.max(1, opts.pairSize ?? 2);
	const offsets: number[] = [];
	let x = 0;
	for (let i = 0; i < count; i++) {
		offsets.push(x);
		if (i === count - 1) break;
		const inPair = opts.pattern === "pairs" && (i + 1) % pairSize !== 0;
		x += SEAT_SIZE + (inPair ? opts.seatGap : opts.groupGap);
	}
	return offsets;
}

/** Sort left→right (then by number) and lay out on one horizontal line. */
export function arrangeSeatsInRow(seats: EngineSeat[], opts: ArrangeRowOptions): EngineSeat[] {
	if (seats.length === 0) return [];
	const sorted = [...seats].sort((a, b) => a.x - b.x || a.number - b.number);
	const offsets = seatXOffsets(sorted.length, opts);
	const renumber = opts.renumber !== false;
	return sorted.map((seat, i) => {
		const pos = clampSeatPosition(
			snap(opts.startX + offsets[i]),
			snap(opts.y),
			opts.canvasWidth,
			opts.canvasHeight,
		);
		return {
			...seat,
			x: pos.x,
			y: pos.y,
			number: renumber ? i + 1 : seat.number,
		};
	});
}

export function seatsPerRowForPattern(
	unitsPerRow: number,
	pattern: SpacingPattern,
	pairSize = 2,
): number {
	const units = Math.max(1, unitsPerRow);
	return pattern === "pairs" ? units * Math.max(1, pairSize) : units;
}

export function rowLabelAtIndex(index: number): string {
	if (index < ROW_LETTERS.length) {
		return ROW_LETTERS[index];
	}
	return `R${index - ROW_LETTERS.length + 1}`;
}

export function sortReadingOrder(seats: EngineSeat[]): EngineSeat[] {
	return [...seats].sort((a, b) => a.y - b.y || a.x - b.x || a.number - b.number);
}

export function unusedRowLabels(used: Iterable<string>, count: number): string[] {
	const taken = new Set(used);
	const labels: string[] = [];
	let i = 0;
	while (labels.length < count) {
		const label = rowLabelAtIndex(i);
		if (!taken.has(label)) {
			labels.push(label);
		}
		i += 1;
	}
	return labels;
}

export type ArrangeGridOptions = {
	startX: number;
	startY: number;
	rowGap: number;
	seatGap: number;
	groupGap: number;
	pattern: SpacingPattern;
	pairSize?: number;
	unitsPerRow: number;
	canvasWidth: number;
	canvasHeight: number;
	rowLabels?: string[];
};

/** Wrap seats into rows (units = seats, or pairs when pattern is pairs), then space each row. */
export function arrangeIntoGrid(seats: EngineSeat[], opts: ArrangeGridOptions): EngineSeat[] {
	if (seats.length === 0) return [];
	const perRow = seatsPerRowForPattern(opts.unitsPerRow, opts.pattern, opts.pairSize);
	const sorted = sortReadingOrder(seats);
	const rowCount = Math.ceil(sorted.length / perRow);
	const labels = opts.rowLabels ?? unusedRowLabels([], rowCount);
	const out: EngineSeat[] = [];
	for (let r = 0; r < rowCount; r++) {
		const chunk = sorted.slice(r * perRow, (r + 1) * perRow);
		const y = opts.startY + r * (SEAT_SIZE + opts.rowGap);
		const arranged = arrangeSeatsInRow(chunk, {
			startX: opts.startX,
			y,
			seatGap: opts.seatGap,
			groupGap: opts.groupGap,
			pattern: opts.pattern,
			pairSize: opts.pairSize,
			canvasWidth: opts.canvasWidth,
			canvasHeight: opts.canvasHeight,
		});
		const label = labels[r] ?? rowLabelAtIndex(r);
		out.push(...arranged.map((seat) => ({ ...seat, rowLabel: label })));
	}
	return out;
}

/** Group by rowLabel, stack rows with rowGap, each row arranged with pattern. */
export function arrangeAllRows(
	seats: EngineSeat[],
	opts: {
		startX: number;
		startY: number;
		rowGap: number;
		seatGap: number;
		groupGap: number;
		pattern: SpacingPattern;
		pairSize?: number;
		unitsPerRow?: number;
		canvasWidth: number;
		canvasHeight: number;
	},
): EngineSeat[] {
	if (opts.unitsPerRow) {
		return arrangeIntoGrid(seats, {
			...opts,
			unitsPerRow: opts.unitsPerRow,
		});
	}
	const groups = new Map<string, EngineSeat[]>();
	for (const seat of seats) {
		const list = groups.get(seat.rowLabel) ?? [];
		list.push(seat);
		groups.set(seat.rowLabel, list);
	}
	const labels = [...groups.keys()].sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true }),
	);
	const out: EngineSeat[] = [];
	let y = opts.startY;
	for (const label of labels) {
		const row = groups.get(label) ?? [];
		out.push(
			...arrangeSeatsInRow(row, {
				startX: opts.startX,
				y,
				seatGap: opts.seatGap,
				groupGap: opts.groupGap,
				pattern: opts.pattern,
				pairSize: opts.pairSize,
				canvasWidth: opts.canvasWidth,
				canvasHeight: opts.canvasHeight,
			}).map((seat) => ({ ...seat, rowLabel: label })),
		);
		y += SEAT_SIZE + opts.rowGap;
	}
	return out;
}

export function cloneSeats(seats: EngineSeat[], dx: number, dy: number): EngineSeat[] {
	return seats.map((seat) =>
		createSeat({
			rowLabel: seat.rowLabel,
			number: seat.number,
			type: seat.type,
			x: seat.x + dx,
			y: seat.y + dy,
			rotation: seat.rotation,
		}),
	);
}

/** Place a horizontal row of seats starting at (x, y), snapped to grid. */
export function createGridRow(opts: {
	seats: EngineSeat[];
	x: number;
	y: number;
	count: number;
	type: SeatType;
	canvasWidth: number;
	canvasHeight: number;
	seatGap?: number;
	groupGap?: number;
	pattern?: SpacingPattern;
	pairSize?: number;
	rowLabel?: string;
}): EngineSeat[] {
	const pattern = opts.pattern ?? "even";
	const seatGap = opts.seatGap ?? DEFAULT_SEAT_GAP;
	const groupGap = opts.groupGap ?? (pattern === "pairs" ? DEFAULT_GROUP_GAP : seatGap);
	const rowLabel = opts.rowLabel ?? nextRowLabel(opts.seats);
	const offsets = seatXOffsets(opts.count, {
		seatGap,
		groupGap,
		pattern,
		pairSize: opts.pairSize,
	});
	const created: EngineSeat[] = [];
	const startX = snap(opts.x);
	const y = snap(opts.y);
	for (let i = 0; i < opts.count; i++) {
		const pos = clampSeatPosition(startX + offsets[i], y, opts.canvasWidth, opts.canvasHeight);
		if (pos.x + SEAT_SIZE > opts.canvasWidth && i > 0) {
			break;
		}
		created.push(
			createSeat({
				rowLabel,
				number: i + 1,
				type: opts.type,
				x: pos.x,
				y: pos.y,
			}),
		);
	}
	return created;
}

export function rotateSeat(seat: EngineSeat, deltaDeg: number): EngineSeat {
	let rotation = seat.rotation + deltaDeg;
	while (rotation > 360) rotation -= 360;
	while (rotation < -360) rotation += 360;
	return { ...seat, rotation };
}
