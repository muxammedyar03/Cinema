"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { SessionSeat } from "../lib/types";
import { cx, ui } from "../lib/ui";

const SEAT = 30;
const SCALE_MIN = 0.35;
const SCALE_MAX = 4;
const DRAG_THRESHOLD = 8;

type HoldResult = {
	orderId: string;
	publicNumber: number;
	totalUzs: number;
	holdExpiresAt: string;
	ttlSec: number;
	seats: Array<{ label: string; priceUzs: number }>;
};

type View = { x: number; y: number; scale: number };

function formatCountdown(ms: number) {
	if (ms <= 0) return "00:00";
	const total = Math.floor(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function seatStatusLabel(seat: SessionSeat) {
	if (seat.type === "BLOCKED") return "Закрыто";
	if (seat.status === "SOLD") return "Продано";
	if (seat.status === "HELD") return "Занято";
	if (seat.status === "BLOCKED") return "Закрыто";
	return seat.type === "VIP" ? "VIP · свободно" : "Свободно";
}

function clampScale(s: number) {
	return Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));
}

function zoomAt(view: View, cx: number, cy: number, nextScale: number): View {
	const scale = clampScale(nextScale);
	const wx = (cx - view.x) / view.scale;
	const wy = (cy - view.y) / view.scale;
	return { scale, x: cx - wx * scale, y: cy - wy * scale };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function fitView(vw: number, vh: number, contentW: number, contentH: number): View {
	const scale = clampScale(Math.min(vw / contentW, vh / contentH) * 0.88);
	return {
		scale,
		x: (vw - contentW * scale) / 2,
		y: (vh - contentH * scale) / 2,
	};
}

export function SeatBooking({
	sessionId,
	seats: initialSeats,
	basePriceUzs,
	remaining,
}: {
	sessionId: string;
	seats: SessionSeat[];
	basePriceUzs: number;
	remaining: number;
}) {
	const router = useRouter();
	const viewportRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<View>({ x: 0, y: 0, scale: 1 });
	const pointersRef = useRef(new Map<number, { x: number; y: number }>());
	const gestureRef = useRef<{
		mode: "none" | "pan" | "pinch";
		panStart: { x: number; y: number; vx: number; vy: number } | null;
		pinchStart: {
			dist: number;
			scale: number;
			mid: { x: number; y: number };
			view: View;
		} | null;
		moved: boolean;
		pendingSeatId: string | null;
	}>({
		mode: "none",
		panStart: null,
		pinchStart: null,
		moved: false,
		pendingSeatId: null,
	});

	const [seats, setSeats] = useState(initialSeats);
	const [selected, setSelected] = useState<string[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [hold, setHold] = useState<HoldResult | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const [tipId, setTipId] = useState<string | null>(null);
	const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
	const [fitted, setFitted] = useState(false);

	const contentW = useMemo(
		() => (seats.length ? Math.max(...seats.map((s) => s.x + SEAT), 280) : 280),
		[seats],
	);
	const contentH = useMemo(
		() => (seats.length ? Math.max(...seats.map((s) => s.y + SEAT), 200) : 200),
		[seats],
	);

	const applyView = useCallback((next: View) => {
		viewRef.current = next;
		setView(next);
	}, []);

	const resetFit = useCallback(() => {
		const el = viewportRef.current;
		if (!el) return;
		const next = fitView(el.clientWidth, el.clientHeight, contentW, contentH);
		applyView(next);
		setFitted(true);
	}, [applyView, contentW, contentH]);

	useEffect(() => {
		setSeats(initialSeats);
	}, [initialSeats]);

	useEffect(() => {
		resetFit();
		const onResize = () => resetFit();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [resetFit]);

	useEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		function onWheelNative(e: WheelEvent) {
			e.preventDefault();
			const node = viewportRef.current;
			if (!node) return;
			const rect = node.getBoundingClientRect();
			const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
			const factor = e.deltaY > 0 ? 0.9 : 1.1;
			applyView(zoomAt(viewRef.current, pt.x, pt.y, viewRef.current.scale * factor));
		}
		el.addEventListener("wheel", onWheelNative, { passive: false });
		return () => el.removeEventListener("wheel", onWheelNative);
	}, [applyView]);

	useEffect(() => {
		if (!hold) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [hold]);

	const byId = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);
	const tipSeat = tipId ? byId.get(tipId) : null;
	const total = selected.reduce((sum, id) => sum + (byId.get(id)?.priceUzs ?? 0), 0);
	const selectedLabels = selected
		.map((id) => {
			const s = byId.get(id);
			return s ? `${s.rowLabel}${s.number}` : null;
		})
		.filter(Boolean)
		.join(" · ");
	const availableCount = seats.filter(
		(s) => s.status === "AVAILABLE" && s.type !== "BLOCKED",
	).length;
	const takenCount = seats.filter(
		(s) => s.status === "HELD" || s.status === "SOLD" || s.type === "BLOCKED",
	).length;
	const holdLeft = hold ? new Date(hold.holdExpiresAt).getTime() - now : 0;

	function localPoint(e: { clientX: number; clientY: number }) {
		const rect = viewportRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function bumpZoom(factor: number) {
		const el = viewportRef.current;
		if (!el) return;
		const cx = el.clientWidth / 2;
		const cy = el.clientHeight / 2;
		applyView(zoomAt(viewRef.current, cx, cy, viewRef.current.scale * factor));
	}

	function onSeatTap(seat: SessionSeat) {
		setTipId(seat.id);
		if (hold) return;
		if (seat.status !== "AVAILABLE" || seat.type === "BLOCKED") return;
		setSelected((prev) =>
			prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id],
		);
		setError("");
	}

	function onPointerDown(e: React.PointerEvent) {
		const el = viewportRef.current;
		if (!el) return;
		el.setPointerCapture(e.pointerId);
		const pt = localPoint(e);
		pointersRef.current.set(e.pointerId, pt);

		const seatBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-seat-id]");
		gestureRef.current.pendingSeatId = seatBtn?.dataset.seatId ?? null;
		gestureRef.current.moved = false;

		if (pointersRef.current.size === 2) {
			const [a, b] = [...pointersRef.current.values()];
			gestureRef.current.mode = "pinch";
			gestureRef.current.panStart = null;
			gestureRef.current.pinchStart = {
				dist: dist(a, b),
				scale: viewRef.current.scale,
				mid: mid(a, b),
				view: { ...viewRef.current },
			};
			gestureRef.current.pendingSeatId = null;
		} else {
			gestureRef.current.mode = "pan";
			gestureRef.current.pinchStart = null;
			gestureRef.current.panStart = {
				x: pt.x,
				y: pt.y,
				vx: viewRef.current.x,
				vy: viewRef.current.y,
			};
		}
	}

	function onPointerMove(e: React.PointerEvent) {
		if (!pointersRef.current.has(e.pointerId)) return;
		const pt = localPoint(e);
		pointersRef.current.set(e.pointerId, pt);
		const g = gestureRef.current;

		if (pointersRef.current.size === 2) {
			const [a, b] = [...pointersRef.current.values()];
			if (!g.pinchStart || g.mode !== "pinch") {
				g.mode = "pinch";
				g.panStart = null;
				g.pendingSeatId = null;
				g.pinchStart = {
					dist: dist(a, b),
					scale: viewRef.current.scale,
					mid: mid(a, b),
					view: { ...viewRef.current },
				};
			}
			g.moved = true;
			const d = dist(a, b);
			const m = mid(a, b);
			const start = g.pinchStart;
			const nextScale = start.scale * (d / Math.max(1, start.dist));
			const wx = (start.mid.x - start.view.x) / start.view.scale;
			const wy = (start.mid.y - start.view.y) / start.view.scale;
			const scale = clampScale(nextScale);
			applyView({ scale, x: m.x - wx * scale, y: m.y - wy * scale });
			return;
		}

		if (g.mode === "pan" && g.panStart) {
			const dx = pt.x - g.panStart.x;
			const dy = pt.y - g.panStart.y;
			if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
				g.moved = true;
				g.pendingSeatId = null;
			}
			if (g.moved) {
				applyView({
					...viewRef.current,
					x: g.panStart.vx + dx,
					y: g.panStart.vy + dy,
				});
			}
		}
	}

	function onPointerUp(e: React.PointerEvent) {
		const g = gestureRef.current;
		const pending = g.pendingSeatId;
		const wasTap = !g.moved;

		pointersRef.current.delete(e.pointerId);
		try {
			viewportRef.current?.releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}

		if (pointersRef.current.size === 1) {
			const remaining = [...pointersRef.current.entries()][0];
			if (!remaining) return;
			const [, pt] = remaining;
			g.mode = "pan";
			g.pinchStart = null;
			g.panStart = {
				x: pt.x,
				y: pt.y,
				vx: viewRef.current.x,
				vy: viewRef.current.y,
			};
			return;
		}

		if (pointersRef.current.size === 0) {
			g.mode = "none";
			g.panStart = null;
			g.pinchStart = null;
			if (wasTap && pending) {
				const seat = byId.get(pending);
				if (seat) onSeatTap(seat);
			} else if (wasTap) {
				setTipId(null);
			}
			g.pendingSeatId = null;
			g.moved = false;
		}
	}

	async function book() {
		if (selected.length === 0) return;
		setBusy(true);
		setError("");
		try {
			await ensureTelegramSession();
			const result = await clientApi<HoldResult>("/bookings/hold", {
				method: "POST",
				body: JSON.stringify({ sessionId, seatIds: selected }),
			});
			setHold(result);
			router.push(`/orders/${result.orderId}`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Не удалось забронировать";
			setError(
				msg.includes("unavailable") || msg.includes("race") || msg.includes("Conflict")
					? "Место уже занято. Выберите другое."
					: "Не удалось забронировать",
			);
			setSelected([]);
			router.refresh();
		} finally {
			setBusy(false);
		}
	}

	if (seats.length === 0) {
		return <p className={ui.empty}>Для этого сеанса нет карты мест.</p>;
	}

	return (
		<>
			<div className="mb-1.5 flex items-center justify-between gap-2 px-4">
				<div className="flex items-center gap-1 rounded-full border border-line bg-elev/80 p-1">
					<button
						type="button"
						className="grid size-8 place-items-center rounded-full text-ink"
						aria-label="Уменьшить"
						onClick={() => bumpZoom(1 / 1.25)}
					>
						<Minus className="size-4" strokeWidth={2} />
					</button>
					<span className="min-w-[2.75rem] text-center font-mono text-[11px] text-muted tabular-nums">
						{Math.round(view.scale * 100)}%
					</span>
					<button
						type="button"
						className="grid size-8 place-items-center rounded-full text-ink"
						aria-label="Увеличить"
						onClick={() => bumpZoom(1.25)}
					>
						<Plus className="size-4" strokeWidth={2} />
					</button>
					<button
						type="button"
						className="grid size-8 place-items-center rounded-full text-muted"
						aria-label="Вписать карту"
						onClick={resetFit}
					>
						<RotateCcw className="size-3.5" strokeWidth={2} />
					</button>
				</div>
				<p className="text-[11px] text-faint">Два пальца — zoom · тяните карту</p>
			</div>

			<div
				ref={viewportRef}
				className={cx(
					"relative mx-3 h-[min(52vh,420px)] touch-none select-none overflow-hidden rounded-2xl border border-line bg-[#0c0c0c]",
					fitted ? "cursor-grab active:cursor-grabbing" : "",
				)}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				<div
					className="absolute left-0 top-0 will-change-transform"
					style={{
						width: contentW,
						height: contentH,
						transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
						transformOrigin: "0 0",
					}}
				>
					{seats.map((seat) => {
						const status = seat.status.toLowerCase();
						const type = seat.type.toLowerCase();
						const isSelected = selected.includes(seat.id);
						const isTaken = status === "held" || status === "sold";
						const isBlocked = status === "blocked" || type === "blocked";
						const isFree = status === "available" && !isBlocked;
						const showTip = tipId === seat.id;

						return (
							<button
								key={seat.id}
								type="button"
								data-seat-id={seat.id}
								disabled={Boolean(hold)}
								className={cx(
									"absolute grid place-items-center rounded-[8px] border-[1.5px] font-ui text-[9px] font-bold",
									isFree && !isSelected && "border-[#8a857c] bg-[#1a1916] text-[#e8e2d6]",
									isFree && type === "vip" && !isSelected && "border-orange/70 text-orange",
									isTaken &&
										"border-[#4a4a4a] bg-[#3a3a3a] text-[#9a9a9a] line-through decoration-[#6a6a6a]",
									isBlocked && "border-[#2a2a2a] bg-[#151515] text-[#4a4a4a] opacity-70",
									isSelected &&
										"z-[2] border-orange bg-orange text-[#171310] shadow-[0_0_14px_rgba(227,166,60,0.55)]",
								)}
								style={{
									left: seat.x,
									top: seat.y,
									width: SEAT,
									height: SEAT,
									transform: `rotate(${seat.rotation}deg)`,
									pointerEvents: "auto",
								}}
								aria-label={`${seat.rowLabel}${seat.number}, ${seatStatusLabel(seat)}, ${formatPrice(seat.priceUzs)}`}
							>
								{seat.rowLabel}
								{seat.number}
								{showTip ? (
									<span
										className="pointer-events-none absolute -top-12 left-1/2 z-20 w-max max-w-[148px] rounded-lg border border-line bg-[#1e1c18] px-2.5 py-1.5 text-center text-[10px] font-semibold leading-snug text-ink shadow-lg normal-case no-underline"
										style={{
											transform: `translateX(-50%) rotate(${-seat.rotation}deg)`,
										}}
									>
										<span className="block">
											{seat.rowLabel}
											{seat.number}
											{type === "vip" ? " · VIP" : ""}
										</span>
										<span className={cx("block", isFree ? "text-orange" : "text-muted")}>
											{formatPrice(seat.priceUzs)}
										</span>
										<span className="block text-[9px] font-medium text-faint">
											{seatStatusLabel(seat)}
										</span>
									</span>
								) : null}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pt-3 pb-1 text-[11px] text-muted">
				<span className="inline-flex items-center gap-1.5">
					<i className="inline-block size-3 rounded-[3px] border-[1.5px] border-[#8a857c] bg-[#1a1916]" />
					Свободно ({availableCount})
				</span>
				<span className="inline-flex items-center gap-1.5">
					<i className="inline-block size-3 rounded-[3px] border border-[#4a4a4a] bg-[#3a3a3a]" />
					Занято ({takenCount})
				</span>
				<span className="inline-flex items-center gap-1.5">
					<i className="inline-block size-3 rounded-[3px] border border-orange bg-orange" />
					Выбрано ({selected.length})
				</span>
			</div>

			{tipSeat ? (
				<p className="px-4 pt-1 text-center text-[12px] text-muted">
					<b className="text-ink">
						{tipSeat.rowLabel}
						{tipSeat.number}
					</b>
					{" · "}
					{seatStatusLabel(tipSeat)}
					{" · "}
					<span className="text-orange">{formatPrice(tipSeat.priceUzs)}</span>
				</p>
			) : null}

			{error ? <p className="px-4 pb-1 text-center text-xs text-bad">{error}</p> : null}
			{hold ? (
				<p className="px-4 py-2 text-center font-mono text-xs text-orange tabular-nums">
					Hold {formatCountdown(holdLeft)}
				</p>
			) : null}

			<div className="fixed bottom-4 left-1/2 z-30 flex w-[min(448px,calc(100%-24px))] -translate-x-1/2 items-center justify-between gap-3 rounded-[20px] border border-line bg-elev/92 px-4 py-3.5 backdrop-blur-[16px]">
				<div className="min-w-0 text-xs text-muted">
					{selected.length > 0
						? selectedLabels || `${selected.length} мест`
						: `от ${formatPrice(basePriceUzs)}`}
					<b className="mt-0.5 block truncate text-[17px] font-bold text-ink">
						{hold
							? formatPrice(hold.totalUzs)
							: selected.length > 0
								? formatPrice(total)
								: `${remaining} мест осталось`}
					</b>
				</div>
				<button
					className={ui.cta}
					type="button"
					disabled={busy || selected.length === 0 || Boolean(hold)}
					onClick={book}
				>
					{hold ? "Забронировано" : busy ? "…" : "Забронировать"}
				</button>
			</div>
		</>
	);
}
