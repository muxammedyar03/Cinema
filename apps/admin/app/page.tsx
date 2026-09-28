import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "../components/button-link";
import {
	type DashboardKpis,
	KpiCharts,
	type KpiTrendPoint,
	KpiWidgets,
	money,
	pct,
} from "../components/dashboard-analytics";
import { RevenueChart } from "../components/revenue-chart";
import { Shell } from "../components/shell";
import { StatusBadge } from "../components/status-badge";
import { assertBillingAccess } from "../lib/billing-access";
import { tashkentTime } from "../lib/format";
import { primaryCinemaName, roleOf } from "../lib/rbac";
import { getMe, serverApi } from "../lib/server-api";
import { Card, CardHeader, DataTable, EmptyState, MetricCard, PageHeader } from "../lib/ui-kit";

type Dashboard = {
	mode?: "platform" | "cinema";
	stats: {
		sessionsToday: number;
		sessionsPublished: number;
		sessionsTotal: number;
		ticketsActive: number;
		ordersPending: number;
		ordersPaid: number;
		paymentsCount: number;
		revenueTodayUzs: number;
		revenueTotalUzs: number;
		refundsPending: number;
		cinemas: number;
		movies: number;
		halls: number;
	};
	cashflow: { incomeUzs: number; expenseUzs: number; netUzs: number };
	todaySessions: Array<{
		id: string;
		startsAt: string;
		status: string;
		movieTitle: string;
		hallName: string;
		cinemaName: string;
		capacity: number;
		occupied: number;
		remaining: number;
		posterUrl?: string | null;
	}>;
	recentOrders: Array<{
		id: string;
		publicNumber: number;
		status: string;
		totalUzs: number;
		createdAt: string;
		cinemaName: string;
		movieTitle: string;
		customer: string;
	}>;
	recentPayments: Array<{
		id: string;
		amountUzs: number;
		status: string;
		provider: string;
		createdAt: string;
		orderNumber: number;
		cinemaName: string;
	}>;
	revenueTrend: Array<{ date: string; incomeUzs: number; expenseUzs: number; netUzs: number }>;
	kpis: DashboardKpis;
	kpiTrend: KpiTrendPoint[];
	period?: { range: "daily" | "weekly"; timezone: string; start: string; end: string };
};

function emptyKpis(): DashboardKpis {
	return {
		occupancyRate: null,
		soldSeats: 0,
		sellableSeats: 0,
		sessions: 0,
		conversionRate: null,
		paidOrders: 0,
		holdsResolved: 0,
		pendingHolds: 0,
		gmvUzs: null,
		refundRate: null,
		refundedAmountUzs: null,
		refundedOrders: 0,
	};
}

function todayHeading() {
	return new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "long",
		timeZone: "Asia/Tashkent",
	});
}

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ range?: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	await assertBillingAccess(user);
	const { range: rangeRaw } = await searchParams;
	const range = rangeRaw === "weekly" ? "weekly" : "daily";
	const data = await serverApi<Dashboard>(`/admin/dashboard?range=${range}`);
	const { stats, cashflow, todaySessions, recentOrders, recentPayments, revenueTrend } = data;
	const kpis = data.kpis ?? emptyKpis();
	const kpiTrend = data.kpiTrend ?? [];
	const role = roleOf(user);
	const cinemaName = primaryCinemaName(user);
	const todayLabel = todayHeading();
	const periodIncome = revenueTrend.reduce((sum, point) => sum + point.incomeUzs, 0);

	if (role === "super") {
		return (
			<Shell user={user}>
				<div className="mb-4 rounded-[10px] border border-primary/30 bg-primary/10 px-3.5 py-3 text-[12.5px] leading-snug text-muted">
					<strong className="text-ink">Конфиденциальность:</strong> суперадминистратор не видит
					заказы, покупателей, билеты и выручку клиентов. Только агрегаты платформы, биллинг и
					комиссия.
				</div>
				<PageHeader
					title="Платформа"
					description={`${todayLabel} · все клиенты · Asia/Tashkent`}
					actions={
						<>
							<ButtonLink href="/clients" variant="secondary">
								Клиенты
							</ButtonLink>
							<ButtonLink href="/billing" variant="secondary">
								Биллинг
							</ButtonLink>
						</>
					}
				/>
				<div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
					<MetricCard label="Клиентов" value={stats.cinemas} variant="primary" />
					<MetricCard
						label="Оплаченных заказов"
						value={stats.ordersPaid}
						hint="Только количество"
					/>
					<MetricCard label="Сеансы сегодня" value={stats.sessionsToday} hint="Количество" />
					<MetricCard label="Активных сеансов" value={stats.sessionsPublished} hint="Количество" />
				</div>
				<KpiWidgets kpis={kpis} hideMoney range={range} />
				<KpiCharts points={kpiTrend} hideMoney range={range} />
				<Card>
					<CardHeader title="Клиенты и биллинг" />
					<p className="px-[22px] py-4 text-[13px] leading-relaxed text-muted">
						Управление клиентами, месячными планами, инвойсами, комиссией с билета и автоматической
						блокировкой при просрочке.
					</p>
					<div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
						<ButtonLink href="/clients" variant="secondary" size="small">
							Клиенты
						</ButtonLink>
						<ButtonLink href="/billing" variant="secondary" size="small">
							Биллинг
						</ButtonLink>
						<ButtonLink href="/billing/invoices" variant="secondary" size="small">
							Инвойсы
						</ButtonLink>
						<ButtonLink href="/billing/settings" variant="secondary" size="small">
							Комиссия
						</ButtonLink>
					</div>
				</Card>
			</Shell>
		);
	}

	return (
		<Shell user={user}>
			<PageHeader
				title="Хорошего дня"
				description={`${todayLabel} · ${cinemaName ?? "ваш кинотеатр"} · Вот что происходит в кинотеатре`}
				actions={<ButtonLink href="/sessions/new">+ Создать сеанс</ButtonLink>}
			/>

			<div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<MetricCard
					label="Выручка сегодня"
					value={money(stats.revenueTodayUzs)}
					hint="За сегодня, Asia/Tashkent"
					variant="primary"
				/>
				<MetricCard
					label="Активные билеты"
					value={stats.ticketsActive.toLocaleString("ru-RU")}
					hint="Сейчас в системе"
				/>
				<MetricCard
					label="Заполняемость"
					value={pct(kpis.occupancyRate)}
					hint="По опубликованным сеансам выбранного периода"
				/>
				<MetricCard
					label="Сеансы сегодня"
					value={stats.sessionsToday}
					hint={stats.halls > 0 ? `Залов в кинотеатре: ${stats.halls}` : "На сегодня"}
				/>
			</div>

			<KpiWidgets kpis={kpis} hideMoney={false} range={range} />

			<div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(285px,1fr)]">
				<Card>
					<CardHeader
						title="Динамика выручки"
						extra={<span className="text-[11px] text-muted">7 дней</span>}
					/>
					<div className="flex flex-wrap items-baseline gap-3 px-6 pt-4">
						<b className="text-[25px] font-bold tracking-tight">{money(periodIncome)}</b>
						<span className="text-[11px] text-muted">доход за показанные дни</span>
					</div>
					{revenueTrend.length === 0 ? (
						<EmptyState
							title="Нет данных о выручке"
							description="График появится после первых оплат."
						/>
					) : (
						<RevenueChart points={revenueTrend} />
					)}
					<div className="grid grid-cols-1 gap-2 border-t border-line px-5 py-4 sm:grid-cols-3">
						<div>
							<span className="block text-[11px] text-muted">Доход</span>
							<b className="text-ok">{money(cashflow.incomeUzs)}</b>
						</div>
						<div>
							<span className="block text-[11px] text-muted">Расход (возвраты)</span>
							<b className="text-bad">{money(cashflow.expenseUzs)}</b>
						</div>
						<div>
							<span className="block text-[11px] text-muted">Итог</span>
							<b className="text-primary">{money(cashflow.netUzs)}</b>
						</div>
					</div>
				</Card>

				<Card>
					<CardHeader
						title="Сегодня на экране"
						extra={
							<Link href="/sessions" className="text-xs font-semibold text-primary">
								Все сеансы
							</Link>
						}
					/>
					{todaySessions.length === 0 ? (
						<EmptyState
							title="Сеансов нет"
							description="Опубликованные сеансы на сегодня появятся здесь."
						/>
					) : (
						<ul className="m-0 list-none px-5">
							{todaySessions.map((session) => {
								const ratio =
									session.capacity > 0
										? Math.min(100, Math.round((session.occupied / session.capacity) * 100))
										: 0;
								return (
									<li
										key={session.id}
										className="flex items-center gap-3 border-b border-[var(--card-line)] py-4 last:border-0"
									>
										<div className="min-w-0 flex-1">
											<b className="block text-[13px]">{session.movieTitle}</b>
											<small className="text-[11px] text-muted">
												{session.hallName} · {session.occupied}/{session.capacity} мест
											</small>
											<div className="mt-1 h-1 w-20 overflow-hidden rounded-sm bg-elev">
												<div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
											</div>
										</div>
										<time className="text-[13px] font-bold">{tashkentTime(session.startsAt)}</time>
									</li>
								);
							})}
						</ul>
					)}
				</Card>
			</div>

			<KpiCharts points={kpiTrend} hideMoney={false} range={range} />

			<Card className="mb-6">
				<CardHeader
					title="Последние заказы"
					extra={
						<Link href="/orders" className="text-xs font-semibold text-primary">
							Все заказы
						</Link>
					}
				/>
				<DataTable
					rows={recentOrders}
					getRowKey={(order) => order.id}
					emptyTitle="Заказов пока нет"
					emptyDescription="После брони в мини-приложении заказы появятся здесь."
					columns={[
						{
							id: "number",
							header: "Заказ",
							cell: (order) => <strong className="text-ink">#{order.publicNumber}</strong>,
						},
						{ id: "movie", header: "Фильм", cell: (order) => order.movieTitle },
						{ id: "customer", header: "Покупатель", cell: (order) => order.customer },
						{
							id: "total",
							header: "Сумма",
							cell: (order) => <strong className="text-ink">{money(order.totalUzs)}</strong>,
						},
						{
							id: "status",
							header: "Статус",
							cell: (order) => <StatusBadge status={order.status} />,
						},
						{
							id: "open",
							header: "",
							cell: (order) => (
								<Link href={`/orders/${order.id}`} className="text-xs font-semibold text-primary">
									Подробнее
								</Link>
							),
						},
					]}
				/>
			</Card>

			<Card>
				<CardHeader title="Платежи" />
				<DataTable
					rows={recentPayments}
					getRowKey={(payment) => payment.id}
					emptyTitle="Платежей пока нет"
					emptyDescription="Оплаты появятся здесь после подтверждения."
					columns={[
						{
							id: "order",
							header: "Заказ",
							cell: (payment) => <strong className="text-ink">#{payment.orderNumber}</strong>,
						},
						{ id: "provider", header: "Провайдер", cell: (payment) => payment.provider },
						{
							id: "amount",
							header: "Сумма",
							cell: (payment) => money(payment.amountUzs),
						},
						{
							id: "status",
							header: "Статус",
							cell: (payment) => <StatusBadge status={payment.status} />,
						},
					]}
				/>
			</Card>
		</Shell>
	);
}
