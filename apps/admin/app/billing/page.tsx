import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "../../components/button-link";
import { Shell } from "../../components/shell";
import { StatusBadge } from "../../components/status-badge";
import { money } from "../../lib/format";
import { roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { statusLabel } from "../../lib/status";
import { Card, CardHeader, DataTable, MetricCard, PageHeader } from "../../lib/ui-kit";
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

export default async function BillingPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	const data = await serverApi<Overview>("/admin/billing/overview");

	return (
		<Shell user={user}>
			<PageHeader
				title="Биллинг"
				description={`${data.period.month}.${data.period.year} · план, просрочка и автоблокировка (${data.settings.lockAfterDays} дн.) · комиссия ${money(data.settings.defaultCommissionUzs)}`}
				actions={
					<>
						<ButtonLink href="/billing/settings" variant="secondary">
							Комиссия и уведомления
						</ButtonLink>
						<ButtonLink href="/billing/invoices" variant="secondary">
							Инвойсы
						</ButtonLink>
					</>
				}
			/>

			<div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<MetricCard label="Клиентов" value={data.summary.clients} variant="primary" />
				<MetricCard label="Оплачено" value={data.summary.paid} />
				<MetricCard label="Просрочка" value={data.summary.late} />
				<MetricCard label="Заблокировано" value={data.summary.locked} />
			</div>

			<Card>
				<CardHeader title="Клиенты · текущий период" />
				<DataTable
					rows={data.clients}
					getRowKey={(client) => client.cinemaId}
					emptyTitle="Клиентов нет"
					columns={[
						{
							id: "name",
							header: "Клиент",
							cell: (client) => (
								<div>
									<Link href={`/clients/${client.cinemaId}`} className="font-semibold text-ink">
										{client.name}
									</Link>
									<small className="block text-[11px] text-muted">
										{statusLabel(client.status)}
									</small>
								</div>
							),
						},
						{
							id: "plan",
							header: "План / мес",
							cell: (client) => money(client.monthlyPlanUzs),
						},
						{
							id: "commission",
							header: "Комиссия",
							cell: (client) => money(client.commissionPerTicketUzs),
						},
						{ id: "orders", header: "Заказы сегодня", cell: (client) => client.ordersToday },
						{ id: "sessions", header: "Активные сеансы", cell: (client) => client.activeSessions },
						{
							id: "sub",
							header: "Подписка",
							cell: (client) => (
								<StatusBadge
									status={
										client.status === "LOCKED"
											? "LOCKED"
											: (client.invoice?.daysLate ?? 0) > 0
												? "OVERDUE"
												: (client.invoice?.status ?? "—")
									}
								/>
							),
						},
						{
							id: "late",
							header: "Просрочка",
							cell: (client) =>
								(client.invoice?.daysLate ?? 0) > 0 ? (
									<b className="text-warn">{client.invoice?.daysLate} дн.</b>
								) : (
									"—"
								),
						},
						{
							id: "actions",
							header: "",
							cell: (client) => (
								<BillingActions
									cinemaId={client.cinemaId}
									invoiceId={client.invoice?.id}
									status={client.status}
									invoiceStatus={client.invoice?.status}
								/>
							),
						},
					]}
				/>
			</Card>
		</Shell>
	);
}
