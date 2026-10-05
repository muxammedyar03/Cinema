"use client";
import { Button } from "@cinema/ui";
import { useEffect } from "react";
import { waitForTelegram } from "../lib/telegram";

export function BookingAction({
	summary,
	detail,
	label,
	disabled = false,
	busy = false,
	onClick,
}: {
	summary: string;
	detail?: string;
	label: string;
	disabled?: boolean;
	busy?: boolean;
	onClick: () => void;
}) {
	useEffect(() => {
		let disposed = false;
		void waitForTelegram().then((tg) => {
			if (disposed || !tg?.MainButton) return;
			try {
				tg.MainButton.hideProgress();
				tg.MainButton.hide();
			} catch {
				/* Older clients may not expose this method. */
			}
		});
		return () => {
			disposed = true;
		};
	}, []);
	return (
		<div className="checkout-bar">
			<div aria-live="polite">
				<small>{detail}</small>
				<b>{summary}</b>
			</div>
			<Button type="button" disabled={disabled || busy} onClick={onClick}>
				{busy ? "Подождите…" : label}
			</Button>
		</div>
	);
}
