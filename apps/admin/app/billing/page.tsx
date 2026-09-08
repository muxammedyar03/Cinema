import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../components/shell";
import { roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { cx, ui } from "../../lib/ui";
import { BillingActions } from "./billing-actions";

type Overview = {
	settings: {
		defaultCommissionUzs: number;
		lockAfterDays: number;
		notifyHourTashkent: number;
	};
	period: { year: number; month: number };
	summary: { clients: number; paid: number; late: number; locked: number };
	clients: Array<{
		cinemaId: string;
		name: string;
		status: string;
		monthlyPlanUzs: number;
		commissionPerTicketUzs: number;
		ordersToday: number;
		activeSessions: number;
		invoice: {
			id: string;
			publicNumber: string;
			status: string;
			amountUzs: number;
			daysLate: number;
		} | null;
	}>;
};

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

function statusBadge(status: string, daysLate: number) {
	if (status === "LOCKED") return cx(ui.badge, ui.badgeBad);
	if (daysLate > 0) return cx(ui.badge, ui.badgeWarn);
	if (status === "ACTIVE" || status === "PAID") return cx(ui.badge, ui.badgeOk);
	return cx(ui.badge, ui.badgeMuted);
}

export default async function BillingPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	const data = await serverApi<Overview>("/admin/billing/overview");

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Биллинг</h1>
					<p className={ui.sub}>
						{data.period.month}.{data.period.year} · план / просрочка / авто-lock (
						{data.settings.lockAfterDays} дн.) · комиссия default{" "}
						{money(data.settings.defaultCommissionUzs)}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Link className={cx(ui.btn, ui.btnGhost)} href="/billing/settings">
						Комиссия и уведомления
					</Link>
					<Link className={cx(ui.btn, ui.btnGhost)} href="/billing/invoices">
						Инвойсы
					</Link>
				</div>
			</div>

			<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
				{[
					["Клиентов", data.summary.clients],
					["Оплачено", data.summary.paid],
					["Просрочка", data.summary.late],
					["LOCKED", data.summary.locked],
				].map(([label, value]) => (
					<div
						key={String(label)}
						className="rounded-2xl border border-line bg-white/[0.04] px-[18px] py-4"
					>
						<b className="mb-1 block text-[26px] font-bold">{value}</b>
						<span className="text-xs text-muted">{label}</span>
					</div>
				))}
			</div>

			<div className={ui.card}>
				<div className={ui.cardH}>Клиенты · текущий период</div>
				<table>
					<thead>
						<tr>
							<th>Клиент</th>
							<th>План / мес</th>
							<th>Комиссия</th>
							<th>Заказы сегодня</th>
							<th>Акт. сеансы</th>
							<th>Подписка</th>
							<th>Просрочка</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{data.clients.map((c) => (
							<tr key={c.cinemaId}>
								<td>
									<Link href={`/clients/${c.cinemaId}`}>
										<b>{c.name}</b>
									</Link>
									<br />
									<small className="text-xs text-muted">{c.status}</small>
								</td>
								<td>{money(c.monthlyPlanUzs)}</td>
								<td>{money(c.commissionPerTicketUzs)}</td>
								<td>{c.ordersToday}</td>
								<td>{c.activeSessions}</td>
								<td>
									<span
										className={statusBadge(
											c.status === "LOCKED" ? "LOCKED" : (c.invoice?.status ?? "—"),
											c.invoice?.daysLate ?? 0,
										)}
									>
										{c.status === "LOCKED" ? "LOCKED" : (c.invoice?.status ?? "—")}
									</span>
								</td>
								<td>
									{(c.invoice?.daysLate ?? 0) > 0 ? (
										<b className="text-warn">{c.invoice?.daysLate} дн.</b>
									) : (
										"—"
									)}
								</td>
								<td>
									<BillingActions
										cinemaId={c.cinemaId}
										invoiceId={c.invoice?.id}
										status={c.status}
										invoiceStatus={c.invoice?.status}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Shell>
	);
}
