"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ensureTelegramSession } from "../lib/api";
import { pickStartParam, resolveDeepLink, type StartParamSources } from "../lib/deep-link";
import { bootTelegramWebApp, getTelegramWebApp, waitForTelegram } from "../lib/telegram";

/** First launch only — later in-app navigation must not re-apply startapp. */
let launchDeepLinkApplied = false;

function normalizePath(pathname: string): string {
	if (!pathname || pathname === "/") return "/";
	return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function launchSources(): StartParamSources {
	return {
		initDataStartParam: getTelegramWebApp()?.initDataUnsafe?.start_param,
		search: window.location.search,
		hash: window.location.hash,
	};
}

/** Loads Telegram WebApp chrome, opens a startapp route once, and establishes the session cookie. */
export function TelegramBoot() {
	const router = useRouter();

	useEffect(() => {
		bootTelegramWebApp();
		void ensureTelegramSession().catch(() => {
			/* catalog stays public; booking/orders surface the error */
		});

		if (launchDeepLinkApplied) return;
		launchDeepLinkApplied = true;

		const initialPath = normalizePath(window.location.pathname);
		const apply = () => {
			if (normalizePath(window.location.pathname) !== initialPath) return;
			const target = resolveDeepLink(launchSources());
			if (!target || target.href === initialPath) return;
			router.replace(target.href);
		};

		// URL / initData are usually ready. If neither is set yet, wait for telegram-web-app.js
		// so a t.me start_param that arrives with the script is not missed.
		if (pickStartParam(launchSources())) {
			apply();
			return;
		}
		void waitForTelegram().then(apply);
	}, [router]);

	return null;
}
