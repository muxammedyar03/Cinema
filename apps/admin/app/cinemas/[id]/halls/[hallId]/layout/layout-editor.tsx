"use client";

import {
	arrangeIntoGrid,
	centerSelectionDelta,
	clampGroupDelta,
	clampSeatPosition,
	cloneSeats,
	createGridRow,
	createLocalId,
	createSeat,
	DEFAULT_GROUP_GAP,
	DEFAULT_SEAT_GAP,
	type EngineSeat,
	GRID_SNAP,
	hitTest,
	type MagnetGuide,
	magnetDelta,
	nextSeatNumber,
	rotateSeat,
	SEAT_SIZE,
	type SeatType,
	type SpacingPattern,
	seatsInRect,
	seatsPerRowForPattern,
	selectionBounds,
	snap,
	unusedRowLabels,
} from "@cinema/seat-engine";
import type { LucideIcon } from "lucide-react";
import {
	AlignCenterHorizontal,
	AlignCenterVertical,
	Armchair,
	ClipboardPaste,
	Copy,
	Crosshair,
	Eraser,
	ListOrdered,
	MousePointer2,
	Redo2,
	RotateCw,
	Rows3,
	Trash2,
	Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clientApi } from "../../../../../../lib/api";
import { cx, ui } from "../../../../../../lib/ui";

type Hall = { id: string; name: string; capacity: number };

type InitialLayout = {
	version: number;
	canvasWidth: number;
	canvasHeight: number;
	seats: Array<{
		id: string;
		rowLabel: string;
		number: number;
		type: SeatType;
		x: number;
		y: number;
		rotation: number;
	}>;
};

type Tool = "select" | "seat" | "row" | "delete" | "rotate";

type Props = {
	cinemaId: string;
	hall: Hall;
	initialLayout: InitialLayout;
};

const PASTE_OFFSET = GRID_SNAP * 3;

const TOOLBAR_ICONS = {
	select: MousePointer2,
	seat: Armchair,
	row: Rows3,
	rotate: RotateCw,
	erase: Eraser,
	copy: Copy,
	paste: ClipboardPaste,
	order: ListOrdered,
	centerX: AlignCenterHorizontal,
	centerY: AlignCenterVertical,
	center: Crosshair,
	trash: Trash2,
	undo: Undo2,
	redo: Redo2,
} as const satisfies Record<string, LucideIcon>;

type ToolbarIconName = keyof typeof TOOLBAR_ICONS;

function ToolbarIconButton({
	label,
	icon,
	onClick,
	active,
	disabled,
}: {
	label: string;
	icon: ToolbarIconName;
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
}) {
	const Icon = TOOLBAR_ICONS[icon];
	return (
		<button
			type="button"
			className={`tb-icon${active ? " on" : ""}`}
			title={label}
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
		>
			<Icon className="size-4" strokeWidth={2} />
		</button>
	);
}

function toEngineSeats(layout: InitialLayout): EngineSeat[] {
	return layout.seats.map((s) => ({
		id: s.id || createLocalId(),
		rowLabel: s.rowLabel,
		number: s.number,
		type: s.type,
		x: s.x,
		y: s.y,
		rotation: s.rotation,
	}));
}

function cloneRelative(source: EngineSeat[]): EngineSeat[] {
	if (source.length === 0) return [];
	return cloneSeats(source, PASTE_OFFSET, PASTE_OFFSET);
}

export function LayoutEditor({ cinemaId, hall, initialLayout }: Props) {
	const [canvasWidth] = useState(initialLayout.canvasWidth);
	const [canvasHeight] = useState(initialLayout.canvasHeight);
	const [version, setVersion] = useState(initialLayout.version);
	const [seats, setSeats] = useState<EngineSeat[]>(() => toEngineSeats(initialLayout));
	const [history, setHistory] = useState<EngineSeat[][]>([]);
	const [redo, setRedo] = useState<EngineSeat[][]>([]);
	const [tool, setTool] = useState<Tool>("select");
	const [paintType, setPaintType] = useState<SeatType>("STANDARD");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [unitsPerRow, setUnitsPerRow] = useState(5);
	const [seatGap, setSeatGap] = useState(DEFAULT_SEAT_GAP);
	const [groupGap, setGroupGap] = useState(DEFAULT_GROUP_GAP);
	const [rowGap, setRowGap] = useState(16);
	const [pattern, setPattern] = useState<SpacingPattern>("pairs");
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [clipboardCount, setClipboardCount] = useState(0);
	const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
		null,
	);
	const [guides, setGuides] = useState<MagnetGuide>({ v: null, h: null });

	const dragRef = useRef<{
		ids: string[];
		ox: number;
		oy: number;
		origins: Record<string, { x: number; y: number }>;
		box: ReturnType<typeof selectionBounds>;
	} | null>(null);
	const marqueeRef = useRef<{ x1: number; y1: number; additive: boolean } | null>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const clipboardRef = useRef<EngineSeat[]>([]);
	const seatsRef = useRef(seats);
	const selectedRef = useRef(selectedIds);
	const keyActionsRef = useRef({
		undo: () => {},
		redoAction: () => {},
		copySelection: () => {},
		pasteClipboard: () => {},
		deleteSelected: () => {},
	});
	seatsRef.current = seats;
	selectedRef.current = selectedIds;

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const selectedSeats = useMemo(
		() => seats.filter((s) => selectedSet.has(s.id)),
		[seats, selectedSet],
	);
	const selected = selectedSeats.length === 1 ? selectedSeats[0] : null;
	const perRow = seatsPerRowForPattern(unitsPerRow, pattern);
	const targetCount = selectedSeats.length > 0 ? selectedSeats.length : seats.length;
	const previewRows = targetCount === 0 ? 0 : Math.ceil(targetCount / perRow);

	const pushHistory = useCallback((prev: EngineSeat[]) => {
		setHistory((h) => [...h.slice(-29), prev.map((s) => ({ ...s }))]);
		setRedo([]);
	}, []);

	const commit = useCallback(
		(next: EngineSeat[], nextSelected?: string[]) => {
			pushHistory(seatsRef.current);
			setSeats(next);
			if (nextSelected) setSelectedIds(nextSelected);
			setError("");
		},
		[pushHistory],
	);

	const undo = useCallback(() => {
		setHistory((h) => {
			if (h.length === 0) return h;
			const prev = h[h.length - 1];
			setSeats((current) => {
				setRedo((r) => [...r.slice(-29), current.map((s) => ({ ...s }))]);
				return prev;
			});
			setSelectedIds([]);
			return h.slice(0, -1);
		});
	}, []);

	const redoAction = useCallback(() => {
		setRedo((r) => {
			if (r.length === 0) return r;
			const next = r[r.length - 1];
			setSeats((current) => {
				setHistory((h) => [...h.slice(-29), current.map((s) => ({ ...s }))]);
				return next;
			});
			setSelectedIds([]);
			return r.slice(0, -1);
		});
	}, []);

	function pointerInCanvas(e: React.PointerEvent): { x: number; y: number } | null {
		const el = stageRef.current;
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function startDrag(e: React.PointerEvent, ids: string[], pt: { x: number; y: number }) {
		const origins: Record<string, { x: number; y: number }> = {};
		for (const id of ids) {
			const seat = seats.find((s) => s.id === id);
			if (seat) origins[id] = { x: seat.x, y: seat.y };
		}
		const moving = ids
			.map((id) => seats.find((s) => s.id === id))
			.filter((s): s is EngineSeat => Boolean(s));
		pushHistory(seats);
		dragRef.current = {
			ids,
			ox: pt.x,
			oy: pt.y,
			origins,
			box: selectionBounds(moving),
		};
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}

	function placeSeat(pt: { x: number; y: number }) {
		if (seats.length >= hall.capacity) {
			setError(`Вместимость ${hall.capacity} — нельзя добавить место.`);
			return;
		}
		const label = selected?.rowLabel ?? seats[seats.length - 1]?.rowLabel ?? "A";
		const pos = clampSeatPosition(
			snap(pt.x - SEAT_SIZE / 2),
			snap(pt.y - SEAT_SIZE / 2),
			canvasWidth,
			canvasHeight,
		);
		const seat = createSeat({
			rowLabel: label,
			number: nextSeatNumber(seats, label),
			type: paintType,
			x: pos.x,
			y: pos.y,
		});
		commit([...seats, seat], [seat.id]);
	}

	function placeRow(pt: { x: number; y: number }) {
		if (seats.length >= hall.capacity) {
			setError(`Вместимость ${hall.capacity} — нельзя добавить место.`);
			return;
		}
		const created = createGridRow({
			seats,
			x: pt.x,
			y: pt.y,
			count: Math.min(perRow, hall.capacity - seats.length),
			type: paintType,
			canvasWidth,
			canvasHeight,
			seatGap,
			groupGap: pattern === "pairs" ? groupGap : seatGap,
			pattern,
		});
		if (created.length === 0) return;
		commit(
			[...seats, ...created],
			created.map((c) => c.id),
		);
	}

	function removeSeat(hit: string) {
		commit(
			seats.filter((x) => x.id !== hit),
			selectedIds.filter((id) => id !== hit),
		);
	}

	function rotateHit(hit: string) {
		commit(
			seats.map((x) => (x.id === hit ? rotateSeat(x, 15) : x)),
			[hit],
		);
	}

	function copySelection() {
		const source = selectedRef.current.length
			? seatsRef.current.filter((s) => selectedRef.current.includes(s.id))
			: [];
		if (source.length === 0) {
			setError("Сначала выберите места, затем Ctrl+C.");
			return;
		}
		clipboardRef.current = source.map((s) => ({ ...s }));
		setClipboardCount(source.length);
		setMessage(`${source.length} мест скопировано`);
		setError("");
	}

	function pasteClipboard() {
		const source = clipboardRef.current;
		if (source.length === 0) {
			setError("Буфер обмена пуст. Сначала Ctrl+C.");
			return;
		}
		if (seatsRef.current.length + source.length > hall.capacity) {
			setError(`Вместимость ${hall.capacity} — вставка не помещается.`);
			return;
		}
		const uniqueRows = [...new Set(source.map((s) => s.rowLabel))];
		const labels = unusedRowLabels(
			seatsRef.current.map((s) => s.rowLabel),
			uniqueRows.length,
		);
		const remap = new Map(uniqueRows.map((old, i) => [old, labels[i] ?? old]));
		const clones = cloneRelative(source).map((seat) => {
			const pos = clampSeatPosition(seat.x, seat.y, canvasWidth, canvasHeight);
			return { ...seat, rowLabel: remap.get(seat.rowLabel) ?? seat.rowLabel, x: pos.x, y: pos.y };
		});
		commit(
			[...seatsRef.current, ...clones],
			clones.map((c) => c.id),
		);
		setMessage(`${clones.length} мест размещено`);
	}

	function arrangeTarget() {
		const current = seatsRef.current;
		const ids = selectedRef.current;
		const target = ids.length > 0 ? current.filter((s) => ids.includes(s.id)) : current;
		if (target.length === 0) return;
		const untouched = ids.length > 0 ? current.filter((s) => !ids.includes(s.id)) : [];
		const rowCount = Math.ceil(target.length / perRow);
		const labels = unusedRowLabels(
			untouched.map((s) => s.rowLabel),
			rowCount,
		);
		const minX = Math.min(...target.map((s) => s.x));
		const minY = Math.min(...target.map((s) => s.y));
		const arranged = arrangeIntoGrid(target, {
			startX: ids.length > 0 ? minX : 80,
			startY: ids.length > 0 ? minY : 80,
			rowGap,
			seatGap,
			groupGap: pattern === "pairs" ? groupGap : seatGap,
			pattern,
			unitsPerRow,
			canvasWidth,
			canvasHeight,
			rowLabels: labels,
		});
		const byId = new Map(arranged.map((s) => [s.id, s]));
		commit(
			current.map((s) => byId.get(s.id) ?? s),
			arranged.map((s) => s.id),
		);
		const mode = pattern === "pairs" ? `${unitsPerRow} пар/ряд` : `${unitsPerRow} мест/ряд`;
		setMessage(`${arranged.length} мест · ${rowCount} рядов · ${mode}`);
	}

	function selectAll() {
		setSelectedIds(seats.map((s) => s.id));
	}

	function deleteSelected() {
		const ids = selectedRef.current;
		if (ids.length === 0) return;
		const drop = new Set(ids);
		commit(
			seatsRef.current.filter((x) => !drop.has(x.id)),
			[],
		);
	}

	function alignToCenter(axis: "x" | "y" | "both") {
		const current = seatsRef.current;
		const ids = selectedRef.current;
		const target = ids.length > 0 ? current.filter((s) => ids.includes(s.id)) : current;
		if (target.length === 0) return;
		const box = selectionBounds(target);
		const { dx, dy } = centerSelectionDelta(box, axis, canvasWidth, canvasHeight);
		if (dx === 0 && dy === 0) return;
		const move = new Set(target.map((s) => s.id));
		commit(
			current.map((s) => (move.has(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s)),
			target.map((s) => s.id),
		);
		setGuides({
			v: axis === "y" ? null : canvasWidth / 2,
			h: axis === "x" ? null : canvasHeight / 2,
		});
		setMessage(
			axis === "both" ? "Выровнено по центру" : axis === "x" ? "Центр по X" : "Центр по Y",
		);
	}

	function onPointerDown(e: React.PointerEvent) {
		const pt = pointerInCanvas(e);
		if (!pt) return;
		const hit = hitTest({ canvasWidth, canvasHeight, seats }, pt.x, pt.y);
		const cloneDrag = (e.ctrlKey || e.metaKey) && e.shiftKey;
		const additive = (e.shiftKey || e.ctrlKey || e.metaKey) && !cloneDrag;

		if (tool === "select") {
			if (hit && cloneDrag) {
				const baseIds = selectedSet.has(hit) ? selectedIds : [hit];
				if (!selectedSet.has(hit)) setSelectedIds(baseIds);
				const source = seats.filter((s) => baseIds.includes(s.id));
				if (seats.length + source.length > hall.capacity) {
					setError(`Вместимость ${hall.capacity} — клон не помещается.`);
					return;
				}
				const clones = cloneSeats(source, 0, 0);
				const next = [...seats, ...clones];
				const cloneIds = clones.map((c) => c.id);
				pushHistory(seats);
				setSeats(next);
				setSelectedIds(cloneIds);
				const origins: Record<string, { x: number; y: number }> = {};
				for (const clone of clones) origins[clone.id] = { x: clone.x, y: clone.y };
				dragRef.current = {
					ids: cloneIds,
					ox: pt.x,
					oy: pt.y,
					origins,
					box: selectionBounds(clones),
				};
				(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
				setMessage(`${clones.length} клон — перетащите на место`);
				return;
			}
			if (hit) {
				let nextIds: string[];
				if (additive) {
					nextIds = selectedSet.has(hit)
						? selectedIds.filter((id) => id !== hit)
						: [...selectedIds, hit];
				} else if (selectedSet.has(hit)) {
					nextIds = selectedIds;
				} else {
					nextIds = [hit];
				}
				setSelectedIds(nextIds);
				if (nextIds.length > 0) startDrag(e, nextIds, pt);
			} else {
				if (!additive) setSelectedIds([]);
				marqueeRef.current = { x1: pt.x, y1: pt.y, additive };
				setMarquee({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
				(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
			}
			return;
		}
		if (tool === "delete") {
			if (hit) removeSeat(hit);
			return;
		}
		if (tool === "rotate") {
			if (hit) rotateHit(hit);
			return;
		}
		if (tool === "seat") {
			if (hit) setSelectedIds([hit]);
			else placeSeat(pt);
			return;
		}
		placeRow(pt);
	}

	function onPointerMove(e: React.PointerEvent) {
		const pt = pointerInCanvas(e);
		if (!pt) return;

		if (marqueeRef.current) {
			setMarquee({
				x1: marqueeRef.current.x1,
				y1: marqueeRef.current.y1,
				x2: pt.x,
				y2: pt.y,
			});
			return;
		}

		const drag = dragRef.current;
		if (!drag || tool !== "select") return;
		let dx = snap(pt.x - drag.ox);
		let dy = snap(pt.y - drag.oy);
		if (e.altKey) {
			setGuides({ v: null, h: null });
		} else {
			const mag = magnetDelta(drag.box, dx, dy, canvasWidth, canvasHeight);
			dx = mag.dx;
			dy = mag.dy;
			setGuides(mag.guides);
		}
		const clamped = clampGroupDelta(drag.box, dx, dy, canvasWidth, canvasHeight);
		dx = clamped.dx;
		dy = clamped.dy;
		setSeats((list) =>
			list.map((s) => {
				const origin = drag.origins[s.id];
				if (!origin) return s;
				return { ...s, x: origin.x + dx, y: origin.y + dy };
			}),
		);
	}

	function onPointerUp() {
		if (marqueeRef.current && marquee) {
			const ids = seatsInRect({ canvasWidth, canvasHeight, seats }, marquee);
			setSelectedIds((prev) =>
				marqueeRef.current?.additive ? [...new Set([...prev, ...ids])] : ids,
			);
		}
		marqueeRef.current = null;
		setMarquee(null);
		dragRef.current = null;
		setGuides({ v: null, h: null });
	}

	function updateSelected(patch: Partial<EngineSeat>) {
		const ids = selectedRef.current;
		if (ids.length === 0) return;
		const set = new Set(ids);
		commit(seatsRef.current.map((s) => (set.has(s.id) ? { ...s, ...patch } : s)));
	}

	function applyType(type: SeatType) {
		setPaintType(type);
		if (selectedRef.current.length > 0) {
			updateSelected({ type });
		}
	}

	keyActionsRef.current = { undo, redoAction, copySelection, pasteClipboard, deleteSelected };

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")
			) {
				return;
			}
			const actions = keyActionsRef.current;
			const mod = e.ctrlKey || e.metaKey;
			if (mod && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) actions.redoAction();
				else actions.undo();
				return;
			}
			if (mod && e.key.toLowerCase() === "y") {
				e.preventDefault();
				actions.redoAction();
				return;
			}
			if (mod && e.key.toLowerCase() === "c") {
				e.preventDefault();
				actions.copySelection();
				return;
			}
			if (mod && e.key.toLowerCase() === "v") {
				e.preventDefault();
				actions.pasteClipboard();
				return;
			}
			if (mod && e.key.toLowerCase() === "a") {
				e.preventDefault();
				setSelectedIds(seatsRef.current.map((s) => s.id));
				return;
			}
			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				actions.deleteSelected();
			}
			if (e.key === "Escape") setSelectedIds([]);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	async function save() {
		setSaving(true);
		setError("");
		setMessage("");
		try {
			const saved = await clientApi<{
				version: number;
				seats: EngineSeat[];
			}>(`/admin/cinemas/${cinemaId}/halls/${hall.id}/layout`, {
				method: "PUT",
				body: JSON.stringify({
					expectedVersion: version,
					canvasWidth,
					canvasHeight,
					seats: seats.map(({ rowLabel, number, type, x, y, rotation }) => ({
						rowLabel,
						number,
						type,
						x,
						y,
						rotation,
					})),
				}),
			});
			setVersion(saved.version);
			setSeats(
				saved.seats.map((s) => ({
					id: s.id,
					rowLabel: s.rowLabel,
					number: s.number,
					type: s.type,
					x: s.x,
					y: s.y,
					rotation: s.rotation,
				})),
			);
			setHistory([]);
			setRedo([]);
			setMessage(`Сохранено · layout v${saved.version}`);
		} catch (err) {
			const text = err instanceof Error ? err.message : "Ошибка сохранения";
			if (text.includes("Layout changed") || text.includes("409")) {
				setError("Схема изменилась. Обновите страницу и сохраните снова.");
			} else if (text.includes("capacity") || text.includes("Seat count")) {
				setError("Число мест превышает вместимость зала.");
			} else {
				setError("Не удалось сохранить. Проверьте данные и попробуйте снова.");
			}
		} finally {
			setSaving(false);
		}
	}

	const tools: Array<{ id: Tool; label: string; icon: ToolbarIconName }> = [
		{ id: "select", label: "Выбор", icon: "select" },
		{ id: "seat", label: "Место", icon: "seat" },
		{ id: "row", label: "Ряд", icon: "row" },
		{ id: "delete", label: "Удаление", icon: "erase" },
		{ id: "rotate", label: "Поворот", icon: "rotate" },
	];
	const types: SeatType[] = ["STANDARD", "VIP", "BLOCKED"];
	const sharedType =
		selectedSeats.length > 0 && selectedSeats.every((s) => s.type === selectedSeats[0]?.type)
			? selectedSeats[0]?.type
			: null;
	const typeActive = selectedIds.length > 0 ? sharedType : paintType;
	const hasSelection = selectedIds.length > 0;

	return (
		<div>
			<div className={ui.row}>
				<div>
					<h1>Редактор схемы</h1>
					<p className={ui.sub}>
						{hall.name} · {seats.length}/{hall.capacity} · v{version || "—"}
						{selectedIds.length > 0 ? ` · ${selectedIds.length} выбрано` : ""}
					</p>
				</div>
				<div className="flex gap-2">
					<ToolbarIconButton
						label="Отменить (Ctrl+Z)"
						icon="undo"
						onClick={undo}
						disabled={history.length === 0}
					/>
					<ToolbarIconButton
						label="Повторить (Ctrl+Y)"
						icon="redo"
						onClick={redoAction}
						disabled={redo.length === 0}
					/>
					<button className={cx(ui.btn, ui.btnPri)} type="button" onClick={save} disabled={saving}>
						{saving ? "Сохранение…" : "Сохранить"}
					</button>
				</div>
			</div>

			{error ? <p className={ui.err}>{error}</p> : null}
			{message ? <p className={ui.okMsg}>{message}</p> : null}

			<div className={cx(ui.card, "layout-card")}>
				<div className="toolbar">
					{tools.map((t) => (
						<ToolbarIconButton
							key={t.id}
							label={t.label}
							icon={t.icon}
							active={tool === t.id}
							onClick={() => setTool(t.id)}
						/>
					))}
					{hasSelection ? (
						<>
							<span className="tb-sep" />
							<ToolbarIconButton label="Копировать (Ctrl+C)" icon="copy" onClick={copySelection} />
							<ToolbarIconButton
								label="Вставить (Ctrl+V)"
								icon="paste"
								onClick={pasteClipboard}
								disabled={clipboardCount === 0}
							/>
							<ToolbarIconButton label="Переупорядочить" icon="order" onClick={arrangeTarget} />
							<ToolbarIconButton
								label="Центр по X"
								icon="centerX"
								onClick={() => alignToCenter("x")}
							/>
							<ToolbarIconButton
								label="Центр по Y"
								icon="centerY"
								onClick={() => alignToCenter("y")}
							/>
							<ToolbarIconButton
								label="По центру"
								icon="center"
								onClick={() => alignToCenter("both")}
							/>
							<ToolbarIconButton
								label={`Удалить (${selectedIds.length})`}
								icon="trash"
								onClick={deleteSelected}
							/>
							<span className="tb-count">{selectedIds.length}</span>
						</>
					) : null}
					<span style={{ flex: 1 }} />
					{types.map((t) => (
						<button
							key={t}
							type="button"
							className={`tb-type ${t.toLowerCase()}${typeActive === t ? " on" : ""}`}
							title={t}
							onClick={() => applyType(t)}
						>
							{t === "STANDARD" ? "Std" : t === "BLOCKED" ? "Blk" : "VIP"}
						</button>
					))}
				</div>

				<div
					ref={stageRef}
					className="layout-canvas"
					style={{ width: canvasWidth, height: canvasHeight }}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
				>
					<div className="screen-arc">ЭКРАН</div>
					<div className="layout-center-x" />
					<div className="layout-center-y" />
					{guides.v !== null ? (
						<div className="layout-guide v on" style={{ left: guides.v }} />
					) : null}
					{guides.h !== null ? (
						<div className="layout-guide h on" style={{ top: guides.h }} />
					) : null}
					{seats.map((seat) => (
						<div
							key={seat.id}
							className={`layout-seat ${seat.type.toLowerCase()}${selectedSet.has(seat.id) ? " selected" : ""}`}
							style={{
								left: seat.x,
								top: seat.y,
								width: SEAT_SIZE,
								height: SEAT_SIZE,
								transform: `rotate(${seat.rotation}deg)`,
							}}
							title={`${seat.rowLabel}${seat.number}`}
						>
							{seat.rowLabel}
							{seat.number}
						</div>
					))}
					{marquee ? (
						<div
							className="layout-marquee"
							style={{
								left: Math.min(marquee.x1, marquee.x2),
								top: Math.min(marquee.y1, marquee.y2),
								width: Math.abs(marquee.x2 - marquee.x1),
								height: Math.abs(marquee.y2 - marquee.y1),
							}}
						/>
					) : null}
				</div>

				<div className="layout-side">
					<div className={ui.field}>
						<label className={ui.label} htmlFor="hall-capacity">
							Вместимость зала
						</label>
						<input id="hall-capacity" className={ui.input} value={hall.capacity} disabled />
					</div>
					<div className={ui.field}>
						<label className={ui.label} htmlFor="seat-count">
							Число мест
						</label>
						<input
							id="seat-count"
							className={ui.input}
							value={`${seats.length} / ${hall.capacity}`}
							disabled
						/>
					</div>

					<div className="side-block">
						<p className="side-title">Упорядочивание</p>
						<div className={ui.field}>
							<span className={ui.label}>Шаблон</span>
							<div className="seg">
								<button
									type="button"
									className={pattern === "even" ? "on" : undefined}
									onClick={() => setPattern("even")}
								>
									Равномерно
								</button>
								<button
									type="button"
									className={pattern === "pairs" ? "on" : undefined}
									onClick={() => setPattern("pairs")}
								>
									Пары 2+2
								</button>
							</div>
						</div>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="row-length">
								{pattern === "pairs" ? "Пар / ряд" : "Мест / ряд"}
							</label>
							<input
								id="row-length"
								className={ui.input}
								type="number"
								min={1}
								max={50}
								value={unitsPerRow}
								onChange={(e) => setUnitsPerRow(Math.max(1, Number(e.target.value) || 1))}
							/>
						</div>
						<p className={cx(ui.hint, "mt-0 mb-3")}>
							{targetCount} мест → {previewRows} рядов ×{" "}
							{pattern === "pairs" ? `${unitsPerRow} пар (${perRow} мест)` : `${perRow} мест`}
						</p>
						<div className={ui.field}>
							<label className={ui.label} htmlFor="seat-gap">
								{pattern === "pairs" ? "Зазор внутри пары" : "Зазор между местами"}
							</label>
							<input
								id="seat-gap"
								className={ui.input}
								type="number"
								min={0}
								max={80}
								value={seatGap}
								onChange={(e) => setSeatGap(Number(e.target.value) || 0)}
							/>
						</div>
						{pattern === "pairs" ? (
							<div className={ui.field}>
								<label className={ui.label} htmlFor="group-gap">
									Между парами (проход)
								</label>
								<input
									id="group-gap"
									className={ui.input}
									type="number"
									min={0}
									max={120}
									value={groupGap}
									onChange={(e) => setGroupGap(Number(e.target.value) || 0)}
								/>
							</div>
						) : null}
						<div className={ui.field}>
							<label className={ui.label} htmlFor="row-gap">
								Между рядами
							</label>
							<input
								id="row-gap"
								className={ui.input}
								type="number"
								min={0}
								max={80}
								value={rowGap}
								onChange={(e) => setRowGap(Number(e.target.value) || 0)}
							/>
						</div>
						<div className="side-actions">
							<button
								className={cx(ui.btn, ui.btnPri, ui.btnSm, "w-full justify-center")}
								type="button"
								onClick={arrangeTarget}
								disabled={seats.length === 0}
							>
								Переупорядочить
							</button>
							<button
								className={cx(ui.btn, ui.btnGhost, ui.btnSm, "w-full justify-center")}
								type="button"
								onClick={selectAll}
							>
								Выбрать все
							</button>
						</div>
						<p className={ui.hint}>
							Ctrl+Z отмена · Ctrl+Y повтор · Ctrl+C/V копировать/вставить
							<br />
							Ctrl+Shift+перетаскивание — клон · Shift+клик / рамка — выбор
							<br />
							При перетаскивании — магнит к центру/краю. Alt — без магнита.
						</p>
					</div>

					{selected ? (
						<>
							<div className={ui.field}>
								<label className={ui.label} htmlFor="seat-row">
									Ряд
								</label>
								<input
									id="seat-row"
									className={ui.input}
									value={selected.rowLabel}
									maxLength={8}
									onChange={(e) => updateSelected({ rowLabel: e.target.value.toUpperCase() })}
								/>
							</div>
							<div className={ui.field}>
								<label className={ui.label} htmlFor="seat-number">
									Номер
								</label>
								<input
									id="seat-number"
									className={ui.input}
									type="number"
									min={1}
									value={selected.number}
									onChange={(e) => updateSelected({ number: Number(e.target.value) || 1 })}
								/>
							</div>
							<div className={ui.field}>
								<label className={ui.label} htmlFor="seat-type">
									Тип
								</label>
								<select
									id="seat-type"
									className={ui.input}
									value={selected.type}
									onChange={(e) => applyType(e.target.value as SeatType)}
								>
									{types.map((t) => (
										<option key={t} value={t}>
											{t}
										</option>
									))}
								</select>
							</div>
						</>
					) : (
						<p className={ui.hint}>
							Место ≠ доступность. Статус хранится в session_seats. При изменении схемы старые
							сеансы остаются на снимке.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
