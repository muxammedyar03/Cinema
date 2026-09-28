"use client";

import { QRCodeSVG } from "qrcode.react";
import { displayTicketCode, ticketQrPayload } from "../lib/tickets";
import { cx } from "../lib/ui";

function ticketStatusRu(status?: string) {
	switch (status) {
		case "USED":
			return "Использован";
		case "CANCELLED":
			return "Отменён";
		case "REFUNDED":
			return "Возвращён";
		default:
			return "";
	}
}

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
	const inactive = Boolean(status && status !== "ACTIVE");
	const statusLabel = ticketStatusRu(status);

	return (
		<div className={cx("ticket-qr", inactive && "is-inactive")}>
			<div className="ticket-qr-plate">
				<QRCodeSVG
					value={payload}
					size={168}
					level="M"
					marginSize={1}
					bgColor="transparent"
					fgColor="currentColor"
				/>
			</div>
			<strong>{displayTicketCode(code)}</strong>
			{label ? <p>{label}</p> : null}
			<p>{inactive && statusLabel ? statusLabel : "Покажите код на входе"}</p>
		</div>
	);
}
