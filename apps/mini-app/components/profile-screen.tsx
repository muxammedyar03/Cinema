"use client";

import { Dialog } from "@cinema/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi, ensureTelegramSession } from "../lib/api";
import { telegramDisplayName } from "../lib/telegram";

type Me = {
	firstName?: string | null;
	lastName?: string | null;
};

export function ProfileScreen() {
	const [name, setName] = useState("Гость");
	const [count, setCount] = useState<number | null>(null);
	const [help, setHelp] = useState(false);

	useEffect(() => {
		const fromTelegram = telegramDisplayName();
		if (fromTelegram) setName(fromTelegram);
		void (async () => {
			try {
				await ensureTelegramSession();
				const [me, orders] = await Promise.all([
					clientApi<Me>("/auth/me").catch(() => null),
					clientApi<unknown[]>("/bookings/orders").catch(() => null),
				]);
				if (!fromTelegram) {
					const fromApi = [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim();
					if (fromApi) setName(fromApi);
				}
				if (orders) setCount(orders.length);
			} catch {
				/* profile stays usable without a session */
			}
		})();
	}, []);

	const letter = name.trim().charAt(0).toUpperCase() || "Г";

	return (
		<div className="profile">
			<div className="avatar" aria-hidden="true">
				{letter}
			</div>
			<h1>{name}</h1>
			<p>Гость</p>
			<div className="profile-menu">
				<Link href="/orders">
					<span>Мои билеты</span>
					<small>{count == null ? "→" : `${count} →`}</small>
				</Link>
				<Link href="/">
					<span>Афиша</span>
					<small>→</small>
				</Link>
				<button type="button" onClick={() => setHelp(true)}>
					<span>Помощь</span>
					<small>→</small>
				</button>
			</div>
			<Dialog open={help} title="Помощь" onClose={() => setHelp(false)}>
				<div className="help">
					<h2>Как выбрать билет?</h2>
					<p>Откройте фильм в афише, выберите дату и время, затем свободные места.</p>
					<h2>Где мой билет?</h2>
					<p>После оплаты билет с QR появится в разделе «Мои билеты».</p>
					<h2>Как вернуть билет?</h2>
					<p>Самостоятельный возврат доступен не позднее чем за 60 минут до сеанса.</p>
				</div>
			</Dialog>
		</div>
	);
}
