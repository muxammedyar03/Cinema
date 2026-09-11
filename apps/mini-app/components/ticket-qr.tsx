"use client";

import { QRCodeSVG } from "qrcode.react";
import { displayTicketCode, ticketQrPayload } from "../lib/tickets";
import { cx } from "../lib/ui";

export function TicketQr({
	code,
	label,
	status,
}: {
	code: string;
	label?: string | null;
	status?: string;
}) {
	const payload = ticketQrPayload(code);
	const inactive = status && status !== "ACTIVE";

	return (
		<div
			className={cx(
				"rounded-2xl border border-line bg-elev/60 p-4 text-center",
				inactive && "opacity-55",
			)}
		>
			<div className="mx-auto grid w-fit place-items-center rounded-xl bg-white p-3">
				<QRCodeSVG value={payload} size={168} level="M" marginSize={1} />
			</div>
			<p className="mt-3 font-mono text-[15px] font-bold tracking-[0.18em] text-ink">
				{displayTicketCode(code)}
			</p>
			{label ? <p className="mt-1 text-[12px] text-muted">{label}</p> : null}
			{inactive ? (
				<p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
					{status}
				</p>
			) : (
				<p className="mt-1 text-[11px] text-faint">Покажите QR на входе</p>
			)}
		</div>
	);
}
