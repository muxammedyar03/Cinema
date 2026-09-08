import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../../components/shell";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { cx, ui } from "../../../lib/ui";
import { ClientActions } from "../client-actions";
import { MarkInvoicePaidButton } from "../mark-paid-button";

type Dossier = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	description: string | null;
	timezone: string;
	status: "ACTIVE" | "DISABLED" | "LOCKED";
	createdAt: string;
	billing: {
		monthlyPlanUzs: number;
		commissionPerTicketUzs: number;
		commissionIsOverride: boolean;
		defaultCommissionUzs: number;
		lockAfterDays: number;
	};
	admins: Array<{
		staffId: string;
		role: string;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
	}>;
	invoices: Array<{
		id: string;
		publicNumber: string;
		periodYear: number;
		periodMonth: number;
		amountUzs: number;
		status: string;
		dueAt: string;
		paidAt: string | null;
		daysLate: number;
	}>;
	currentInvoice: {
		id: string;
		publicNumber: string;
		status: string;
		amountUzs: number;
		daysLate: number;
		dueAt: string;
	} | null;
	stats: {
		halls: number;
		sessions: number;
		ordersTotal: number;
		ordersToday: number;
		activeSessions: number;
		ticketsActive: number;
		paidInvoices: number;
		openInvoices: number;
	};
};

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

function statusCls(status: string) {
	if (status === "ACTIVE" || status === "PAID") return cx(ui.badge, ui.badgeOk);
	if (status === "LOCKED" || status === "OVERDUE") return cx(ui.badge, ui.badgeBad);
	if (status === "DUE" || status === "DISABLED") return cx(ui.badge, ui.badgeWarn);
	return cx(ui.badge, ui.badgeMuted);
}

const statBox = "rounded-2xl border border-line bg-white/[0.04] px-[18px] py-4";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	const { id } = await params;
	const client = await serverApi<Dossier>(`/admin/cinemas/${id}/dossier`);

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<div className="mb-2 flex flex-wrap items-center gap-2">
						<h1 className={ui.pageTitle}>{client.name}</h1>
						<span className={statusCls(client.status)}>{client.status}</span>
					</div>
					<p className={cx(ui.sub, "mb-0")}>
						{[client.address, client.phone, client.timezone].filter(Boolean).join(" · ") ||
							"Клиент платформы"}
					</p>
				</div>
				<ClientActions clientId={client.id} status={client.status} />
			</div>

			<div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
				{[
					["Заказы сегодня", client.stats.ordersToday],
					["Акт. сеансы", client.stats.activeSessions],
					["Залы", client.stats.halls],
					["Заказов всего", client.stats.ordersTotal],
					["Инвойсы PAID", client.stats.paidInvoices],
					["Открытые инвойсы", client.stats.openInvoices],
				].map(([label, value]) => (
					<div key={String(label)} className={statBox}>
						<b className="mb-1 block text-[22px] font-bold">{value}</b>
						<span className="text-[11px] text-muted">{label}</span>
					</div>
				))}
			</div>

			<div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
				<section className={ui.card}>
					<div className={ui.cardH}>
						<span>Подписка и комиссия</span>
						<Link className="text-xs font-semibold text-orange" href={`/clients/${id}/edit`}>
							Изменить
						</Link>
					</div>
					<div className="space-y-3 px-[18px] py-4 text-[13px]">
						<div className="flex justify-between gap-3 border-b border-line pb-3">
							<span className="text-muted">План / месяц</span>
							<b>{money(client.billing.monthlyPlanUzs)}</b>
						</div>
						<div className="flex justify-between gap-3 border-b border-line pb-3">
							<span className="text-muted">Комиссия / билет</span>
							<b>
								{money(client.billing.commissionPerTicketUzs)}
								{client.billing.commissionIsOverride ? (
									<span className="ml-1 text-[11px] font-medium text-faint">override</span>
								) : (
									<span className="ml-1 text-[11px] font-medium text-faint">default</span>
								)}
							</b>
						</div>
						<div className="flex justify-between gap-3 border-b border-line pb-3">
							<span className="text-muted">Текущий инвойс</span>
							{client.currentInvoice ? (
								<span className="text-right">
									<span className={statusCls(client.currentInvoice.status)}>
										{client.currentInvoice.status}
									</span>
									<br />
									<small className="text-muted">
										{client.currentInvoice.publicNumber} · {money(client.currentInvoice.amountUzs)}
									</small>
								</span>
							) : (
								<span className="text-muted">—</span>
							)}
						</div>
						<div className="flex justify-between gap-3">
							<span className="text-muted">Просрочка / авто-lock</span>
							<span>
								{client.currentInvoice && client.currentInvoice.daysLate > 0 ? (
									<b className="text-warn">{client.currentInvoice.daysLate} дн.</b>
								) : (
									"0 дн."
								)}
								<span className="text-faint"> / {client.billing.lockAfterDays} дн.</span>
							</span>
						</div>
					</div>
				</section>

				<section className={ui.card}>
					<div className={ui.cardH}>Админы клиента</div>
					{client.admins.length === 0 ? (
						<p className="px-[18px] py-6 text-[13px] text-muted">Админов пока нет</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>Email</th>
									<th>Имя</th>
									<th>Роль</th>
								</tr>
							</thead>
							<tbody>
								{client.admins.map((a) => (
									<tr key={a.staffId}>
										<td>{a.email ?? "—"}</td>
										<td>{[a.firstName, a.lastName].filter(Boolean).join(" ") || "—"}</td>
										<td>
											<span className={cx(ui.badge, ui.badgeMuted)}>{a.role}</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</section>
			</div>

			<section className={ui.card}>
				<div className={cx(ui.cardH, "flex items-center justify-between")}>
					<span>Инвойсы и история оплат</span>
					<Link
						className="text-xs font-semibold text-orange"
						href={`/billing/invoices?cinemaId=${client.id}`}
					>
						Все инвойсы
					</Link>
				</div>
				{client.invoices.length === 0 ? (
					<p className="px-[18px] py-6 text-[13px] text-muted">Инвойсов пока нет</p>
				) : (
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>Период</th>
								<th>Сумма</th>
								<th>Статус</th>
								<th>Due</th>
								<th>Оплачен</th>
								<th>Просрочка</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{client.invoices.map((inv) => (
								<tr key={inv.id}>
									<td>{inv.publicNumber}</td>
									<td>
										{inv.periodMonth}/{inv.periodYear}
									</td>
									<td>{money(inv.amountUzs)}</td>
									<td>
										<span className={statusCls(inv.status)}>{inv.status}</span>
									</td>
									<td>
										{new Date(inv.dueAt).toLocaleDateString("ru-RU", {
											timeZone: "Asia/Tashkent",
										})}
									</td>
									<td>
										{inv.paidAt
											? new Date(inv.paidAt).toLocaleDateString("ru-RU", {
													timeZone: "Asia/Tashkent",
												})
											: "—"}
									</td>
									<td>{inv.daysLate > 0 ? `${inv.daysLate} дн.` : "—"}</td>
									<td className="text-right">
										{inv.status !== "PAID" && inv.status !== "VOID" ? (
											<MarkInvoicePaidButton invoiceId={inv.id} />
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			{client.description ? (
				<section className={cx(ui.card, "mt-4")}>
					<div className={ui.cardH}>Описание</div>
					<p className="px-[18px] py-4 text-[13px] leading-relaxed text-muted">
						{client.description}
					</p>
				</section>
			) : null}
		</Shell>
	);
}
