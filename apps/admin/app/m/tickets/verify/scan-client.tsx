"use client";

import { Camera, Keyboard } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "../../../../components/status-badge";
import { clientApi } from "../../../../lib/api";
import { errorText } from "../../../../lib/api-error";
import { displayTicketCode, parseScannedCode } from "../../../../lib/tickets";
import { ui } from "../../../../lib/ui";
import { Button, Card, CardBody, PageHeader } from "../../../../lib/ui-kit";

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
		<div className="mx-auto w-full max-w-[550px]">
			<PageHeader title="Проверка билетов" description="Отсканируйте QR или введите код билета" />
			<Card>
				<CardBody className="text-center">
					<div className="mx-auto grid h-[190px] w-[190px] place-items-center overflow-hidden rounded-[20px] border-2 border-dashed border-[color-mix(in_srgb,var(--primary)_45%,var(--line))] bg-elev">
						<video
							ref={videoRef}
							className={cameraOn ? "h-full w-full object-cover" : "hidden"}
							playsInline
							muted
						/>
						{cameraOn ? null : (
							<Camera className="size-12 text-primary" strokeWidth={1.4} aria-hidden="true" />
						)}
					</div>
					<h2 className="mb-1 mt-5 text-[19px] font-semibold">Контроль входа</h2>
					<p className="m-0 text-[13px] text-muted">
						Камера работает на телефоне. Можно ввести код вручную.
					</p>
					<div className="mt-4">
						<Button
							className="w-full"
							type="button"
							onClick={() => void (cameraOn ? stopCamera() : startCamera())}
						>
							<Camera className="size-4" strokeWidth={2} />
							{cameraOn ? "Остановить камеру" : "Открыть камеру"}
						</Button>
					</div>
					<label className="mt-4 block text-left">
						<span className={ui.label}>
							<Keyboard className="mr-1 inline size-3.5" /> Код билета
						</span>
						<input
							className={`${ui.input} mt-1.5`}
							value={code}
							onChange={(event) => setCode(event.target.value)}
							placeholder="Код или ссылка из QR"
							autoCapitalize="characters"
							aria-label="Код билета"
						/>
					</label>
					<Button
						className="mt-3 w-full"
						variant="secondary"
						type="button"
						disabled={busy}
						onClick={() => void lookup(code)}
					>
						{busy ? "Проверка…" : "Проверить билет"}
					</Button>
					{error ? <p className="mt-3 text-[13px] text-bad">{error}</p> : null}
					{ok ? <p className="mt-3 text-[13px] text-ok">{ok}</p> : null}
				</CardBody>
			</Card>

			{preview ? (
				<Card className="mt-4">
					<CardBody className="text-left">
						<p className="m-0 text-xs text-muted">Результат</p>
						<h2 className="mb-2 mt-1 text-[19px] font-semibold">
							Билет {displayTicketCode(preview.code)}
						</h2>
						<p className="m-0 font-semibold">{preview.session?.movieTitle ?? "Сеанс"}</p>
						<p className="mt-1 text-[13px] text-muted">
							{preview.seatLabel ?? preview.type ?? "Место не указано"}
							{preview.orderPublicNumber ? ` · заказ #${preview.orderPublicNumber}` : ""}
						</p>
						<div className="mt-3">
							<StatusBadge status={preview.status} />
						</div>
						{preview.status === "ACTIVE" ? (
							<Button
								className="mt-4 w-full"
								type="button"
								disabled={busy}
								onClick={() => void markUsed()}
							>
								Отметить вход
							</Button>
						) : null}
					</CardBody>
				</Card>
			) : null}

			<Button
				className="mt-4 w-full"
				variant="secondary"
				type="button"
				onClick={() => {
					setPreview(null);
					setOk("");
					setError("");
					setCode("");
				}}
			>
				Следующий билет
			</Button>
		</div>
	);
}
