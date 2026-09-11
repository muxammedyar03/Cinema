"use client";

import { Camera, Keyboard, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clientApi } from "../../../../lib/api";
import { errorText } from "../../../../lib/api-error";
import { displayTicketCode, parseScannedCode } from "../../../../lib/tickets";
import { cx, ui } from "../../../../lib/ui";

type TicketPreview = {
	id: string;
	code: string;
	status: string;
	usedAt?: string | null;
	type?: string;
	seatLabel?: string | null;
	session?: { id: string; startsAt: string; movieTitle: string };
	orderPublicNumber?: number;
};

type VerifyResponse = { ticket: TicketPreview };

function ticketFromUnknown(data: TicketPreview | VerifyResponse): TicketPreview {
	if ("ticket" in data && data.ticket) return data.ticket;
	return data as TicketPreview;
}

export function TicketVerifyClient({ initialCode }: { initialCode: string }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const rafRef = useRef<number>(0);
	const [code, setCode] = useState(initialCode);
	const [preview, setPreview] = useState<TicketPreview | null>(null);
	const [error, setError] = useState("");
	const [ok, setOk] = useState("");
	const [busy, setBusy] = useState(false);
	const [cameraOn, setCameraOn] = useState(false);

	const stopCamera = useCallback(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		for (const t of streamRef.current?.getTracks() ?? []) t.stop();
		streamRef.current = null;
		setCameraOn(false);
	}, []);

	useEffect(() => () => stopCamera(), [stopCamera]);

	const lookup = useCallback(async (raw: string) => {
		const normalized = parseScannedCode(raw);
		if (!normalized) {
			setError("Введите или отсканируйте код билета");
			return;
		}
		setBusy(true);
		setError("");
		setOk("");
		try {
			const data = await clientApi<TicketPreview | VerifyResponse>(
				`/admin/tickets/by-code/${encodeURIComponent(normalized)}`,
			);
			setPreview(ticketFromUnknown(data));
			setCode(displayTicketCode(normalized));
		} catch (err) {
			setPreview(null);
			setError(errorText(err, "Билет не найден"));
		} finally {
			setBusy(false);
		}
	}, []);

	async function markUsed() {
		if (!preview) return;
		setBusy(true);
		setError("");
		try {
			const data = await clientApi<VerifyResponse>("/admin/tickets/verify", {
				method: "POST",
				body: JSON.stringify({ code: preview.code, action: "USE" }),
			});
			setPreview(data.ticket ?? preview);
			setOk("Вход отмечен");
		} catch (err) {
			setError(errorText(err, "Не удалось отметить билет"));
		} finally {
			setBusy(false);
		}
	}

	async function startCamera() {
		setError("");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: "environment" } },
			});
			streamRef.current = stream;
			const video = videoRef.current;
			if (video) {
				video.srcObject = stream;
				await video.play();
			}
			setCameraOn(true);
			const Detector = (
				window as unknown as {
					BarcodeDetector?: new (opts: {
						formats: string[];
					}) => {
						detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
					};
				}
			).BarcodeDetector;
			if (!Detector || !videoRef.current) return;
			const detector = new Detector({ formats: ["qr_code"] });
			const tick = async () => {
				const el = videoRef.current;
				if (!el || el.readyState < 2) {
					rafRef.current = requestAnimationFrame(() => void tick());
					return;
				}
				try {
					const codes = await detector.detect(el);
					const value = codes[0]?.rawValue;
					if (value) {
						stopCamera();
						await lookup(value);
						return;
					}
				} catch {
					/* keep scanning */
				}
				rafRef.current = requestAnimationFrame(() => void tick());
			};
			rafRef.current = requestAnimationFrame(() => void tick());
		} catch {
			setError("Камера недоступна — введите код вручную");
		}
	}

	useEffect(() => {
		if (initialCode) void lookup(initialCode);
	}, [initialCode, lookup]);

	return (
		<div>
			<div className="mb-4 flex items-center gap-2">
				<ScanLine className="size-5 text-orange" strokeWidth={1.8} />
				<h1 className={ui.pageTitle}>QR проверка</h1>
			</div>

			<div className="overflow-hidden rounded-2xl border border-line bg-elev">
				<video
					ref={videoRef}
					className={cx("h-56 w-full bg-black object-cover", !cameraOn && "hidden")}
					playsInline
					muted
				/>
				{!cameraOn ? (
					<div className="grid h-40 place-items-center text-sm text-muted">
						Камера для сканирования QR
					</div>
				) : null}
			</div>

			<div className="mt-3 flex gap-2">
				<button
					className={cx(ui.btn, ui.btnPri, "flex-1 justify-center")}
					type="button"
					onClick={() => void (cameraOn ? stopCamera() : startCamera())}
				>
					<Camera className="size-4" strokeWidth={2} />
					{cameraOn ? "Стоп" : "Камера"}
				</button>
			</div>

			<label className={cx(ui.field, "mt-4")}>
				<span className={ui.label}>
					<Keyboard className="mr-1 inline size-3.5" /> Код билета
				</span>
				<input
					className={ui.input}
					value={code}
					onChange={(e) => setCode(e.target.value)}
					placeholder="XXXX-XXXX-XXXX или URL"
					autoCapitalize="characters"
				/>
			</label>
			<button
				className={cx(ui.btn, ui.btnGhost, "w-full justify-center")}
				type="button"
				disabled={busy}
				onClick={() => void lookup(code)}
			>
				{busy ? "…" : "Найти билет"}
			</button>

			{error ? <p className={cx(ui.err, "mt-3")}>{error}</p> : null}
			{ok ? <p className={cx(ui.okMsg, "mt-3")}>{ok}</p> : null}

			{preview ? (
				<div className={cx(ui.card, "mt-4")}>
					<div className={ui.cardH}>Билет {displayTicketCode(preview.code)}</div>
					<div className="space-y-1.5 px-4 py-3 text-sm">
						<p>
							<b>{preview.session?.movieTitle ?? "Сеанс"}</b>
						</p>
						<p className="text-muted">
							{preview.seatLabel ?? preview.type ?? "—"}
							{preview.orderPublicNumber ? ` · заказ #${preview.orderPublicNumber}` : ""}
						</p>
						<p>
							<span
								className={cx(
									ui.badge,
									preview.status === "ACTIVE" && ui.badgeOk,
									preview.status === "USED" && ui.badgeWarn,
									(preview.status === "REFUNDED" || preview.status === "CANCELLED") && ui.badgeBad,
								)}
							>
								{preview.status}
							</span>
						</p>
					</div>
					{preview.status === "ACTIVE" ? (
						<div className="border-t border-line p-3">
							<button
								className={cx(ui.btn, ui.btnPri, "w-full justify-center")}
								type="button"
								disabled={busy}
								onClick={() => void markUsed()}
							>
								Отметить вход
							</button>
						</div>
					) : null}
				</div>
			) : null}

			<button
				className={cx(ui.btn, ui.btnGhost, "mt-4 w-full justify-center")}
				type="button"
				onClick={() => {
					setPreview(null);
					setOk("");
					setError("");
					setCode("");
				}}
			>
				Следующий билет
			</button>
		</div>
	);
}
