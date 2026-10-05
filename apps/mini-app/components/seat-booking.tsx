"use client";

import { Toast } from "@cinema/ui";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { errorText } from "../lib/api-error";
import { formatCountdown, formatPrice } from "../lib/format";
import type { SessionSeat } from "../lib/types";
import { cx } from "../lib/ui";
import { BookingAction } from "./booking-action";

const SEAT = 30;
const SCALE_MIN = 0.1;
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
	const scale = clampScale((vw / contentW) * 0.96);
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
	const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
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
		const el = viewportRef.current;
		if (!el) return;
		const fit = () => {
			if (el.clientWidth < 40 || el.clientHeight < 40) return;
			applyView(fitView(el.clientWidth, el.clientHeight, contentW, contentH));
			setFitted(true);
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(el);
		return () => observer.disconnect();
	}, [applyView, contentH, contentW]);

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
		const pt = localPoint(e);
		const last = lastTapRef.current;
		const doubleTap = wasTap && last && Date.now() - last.at < 300 && dist(last, pt) < 24;
		if (wasTap) lastTapRef.current = { ...pt, at: Date.now() };
		if (doubleTap) {
			applyView(zoomAt(viewRef.current, pt.x, pt.y, viewRef.current.scale * 1.6));
			g.pendingSeatId = null;
		}

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
			if (wasTap && !doubleTap && pending) {
				// Overlapping expanded hit areas: prefer the nearest seat centre.
				const wx = (pt.x - viewRef.current.x) / viewRef.current.scale;
				const wy = (pt.y - viewRef.current.y) / viewRef.current.scale;
				const nearest = seats.reduce(
					(best, seat) =>
						Math.hypot(seat.x + SEAT / 2 - wx, seat.y + SEAT / 2 - wy) <
						Math.hypot(best.x + SEAT / 2 - wx, best.y + SEAT / 2 - wy)
							? seat
							: best,
					seats[0],
				);
				const seat = nearest ?? byId.get(pending);
				if (seat) onSeatTap(seat);
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
			const msg = errorText(err, "Не удалось забронировать");
			setError(
				msg.includes("unavailable") || msg.includes("race") || msg.includes("Conflict")
					? "Место уже занято. Выберите другое."
					: msg,
			);
			setSelected([]);
			router.refresh();
		} finally {
			setBusy(false);
		}
	}

	if (seats.length === 0) {
		return <p className="note">Для этого сеанса нет карты мест.</p>;
	}

	return (
		<>
			<div className="zoom-bar">
				<div className="zoom-controls">
					<button type="button" aria-label="Уменьшить" onClick={() => bumpZoom(1 / 1.25)}>
						<Minus size={16} strokeWidth={2} />
					</button>
					<span>{Math.round(view.scale * 100)}%</span>
					<button type="button" aria-label="Увеличить" onClick={() => bumpZoom(1.25)}>
						<Plus size={16} strokeWidth={2} />
					</button>
					<button type="button" aria-label="Вписать карту" onClick={resetFit}>
						<RotateCcw size={14} strokeWidth={2} />
					</button>
				</div>
				<p className="zoom-hint">Два пальца — масштаб</p>
			</div>

			<div
				ref={viewportRef}
				role="application"
				aria-label="Схема зала. Два пальца — масштаб, перетаскивание — перемещение."
				onKeyDown={(e) => {
					if (e.key === "+") bumpZoom(1.25);
					if (e.key === "-") bumpZoom(0.8);
					if (e.key === "0") resetFit();
				}}
				className={cx("seat-viewport", fitted && "is-ready")}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={() => {
					pointersRef.current.clear();
					gestureRef.current.pendingSeatId = null;
					gestureRef.current.mode = "none";
				}}
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

						return (
							<button
								key={seat.id}
								type="button"
								data-seat-id={seat.id}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										e.stopPropagation();
										onSeatTap(seat);
									}
								}}
								disabled={Boolean(hold)}
								className={cx(
									"seat",
									isFree && !isSelected && "seat-free",
									isFree && type === "vip" && !isSelected && "seat-vip",
									isTaken && "seat-taken",
									isBlocked && "seat-blocked",
									isSelected && "seat-selected",
								)}
								style={{
									left: seat.x - (Math.max(SEAT, 40 / view.scale) - SEAT) / 2,
									top: seat.y - (Math.max(SEAT, 40 / view.scale) - SEAT) / 2,
									width: Math.max(SEAT, 40 / view.scale),
									height: Math.max(SEAT, 40 / view.scale),
									transform: `rotate(${seat.rotation}deg)`,
									pointerEvents: "auto",
								}}
								aria-label={`${seat.rowLabel}${seat.number}, ${seatStatusLabel(seat)}, ${formatPrice(seat.priceUzs)}`}
							>
								<span
									className="seat-face"
									style={{
										width: Math.max(SEAT, 28 / view.scale),
										height: Math.max(SEAT, 28 / view.scale),
									}}
								>
									{seat.number}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="legend">
				<span>
					<i />
					Свободно ({availableCount})
				</span>
				<span>
					<i className="swatch-selected" />
					Выбрано ({selected.length})
				</span>
				<span>
					<i className="swatch-taken" />
					Занято ({takenCount})
				</span>
			</div>

			{hold ? (
				<p className="hold-line" aria-live="polite">
					Бронь удерживается {formatCountdown(holdLeft)}
				</p>
			) : null}
			<Toast message={error} open={Boolean(error)} />

			<BookingAction
				summary={
					selected.length
						? `${selected.length} билета · ${formatPrice(total)}`
						: `от ${formatPrice(basePriceUzs)}`
				}
				detail={selectedLabels || `Доступно ${remaining} мест`}
				label="Продолжить"
				busy={busy}
				disabled={!selected.length}
				onClick={() => void book()}
			/>
		</>
	);
}
