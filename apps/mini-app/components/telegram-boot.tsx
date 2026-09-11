"use client";

import { useEffect } from "react";
import { ensureTelegramSession } from "../lib/api";
import { bootTelegramWebApp } from "../lib/telegram";

/** Loads Telegram WebApp chrome and establishes the session cookie. */
export function TelegramBoot() {
	useEffect(() => {
		bootTelegramWebApp();
		void ensureTelegramSession().catch(() => {
			/* catalog stays public; booking/orders surface the error */
		});
	}, []);
	return null;
}
