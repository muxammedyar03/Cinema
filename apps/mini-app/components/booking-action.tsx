"use client";
import { Button } from "@cinema/ui";
import { useEffect, useRef } from "react";
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
	const action = useRef(onClick);
	action.current = onClick;
	useEffect(() => {
		let disposed = false;
		let cleanup = () => {};
		void waitForTelegram().then((tg) => {
			if (disposed || !tg?.initData || !tg.MainButton) return;
			const button = tg.MainButton;
			const click = () => {
				if (!disabled && !busy) action.current();
			};
			try {
				button.setText(label);
				if (disabled || busy) button.disable();
				else button.enable();
				if (busy) button.showProgress();
				else button.hideProgress();
				button.onClick(click);
				button.show();
				cleanup = () => {
					button.offClick(click);
					button.hideProgress();
					button.hide();
				};
			} catch {
				/* Sticky HTML action remains available. */
			}
		});
		return () => {
			disposed = true;
			cleanup();
		};
	}, [label, disabled, busy]);
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
