import Link from "next/link";
import { redirect } from "next/navigation";
import { RevenueChart } from "../components/revenue-chart";
import { Shell } from "../components/shell";
import { assertBillingAccess } from "../lib/billing-access";
import { primaryCinemaName, roleOf } from "../lib/rbac";
import { getMe, serverApi } from "../lib/server-api";
import { cx, ui } from "../lib/ui";

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
};

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

function timeLabel(iso: string) {
	return new Date(iso).toLocaleString("ru-RU", {
		timeZone: "Asia/Tashkent",
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function statusClass(status: string) {
	if (status === "PAID" || status === "PUBLISHED" || status === "ACTIVE") {
		return cx(ui.badge, ui.badgeOk);
	}
	if (status === "PENDING_PAYMENT" || status === "PENDING" || status === "DRAFT") {
		return cx(ui.badge, ui.badgeWarn);
	}
	return cx(ui.badge, ui.badgeMuted);
}

const statCls = "rounded-2xl border border-line bg-white/[0.04] px-[18px] py-4";
const cashPill = "rounded-[14px] border border-line bg-white/[0.02] px-3 py-2";
const quickLink =
	"inline-flex h-8 items-center rounded-full border border-line px-3 text-xs font-semibold text-muted hover:border-orange/40 hover:text-orange";

export default async function HomePage() {
	const user = await getMe();
	if (!user) redirect("/login");
	await assertBillingAccess(user);
	const data = await serverApi<Dashboard>("/admin/dashboard");
	const { stats, cashflow, todaySessions, recentOrders, recentPayments, revenueTrend } = data;
	const publishedToday = todaySessions.filter((s) => s.status === "PUBLISHED").length;
	const role = roleOf(user);
	const cinemaName = primaryCinemaName(user);
	const todayLabel = new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		timeZone: "Asia/Tashkent",
	});

	if (role === "super") {
		return (
			<Shell user={user}>
				<div className="mb-4 rounded-[10px] border border-[#7a6b9c]/35 bg-[#7a6b9c]/12 px-3.5 py-3 text-[12.5px] leading-snug text-muted">
					<strong className="text-ink">Конфиденциальность:</strong> Super Admin не видит заказы,
					покупателей, билеты и выручку клиентов. Только агрегаты платформы, биллинг и комиссия.
				</div>
				<div className="mb-[18px]">
					<h1>Платформа</h1>
					<p className={cx(ui.sub, "mb-0")}>{todayLabel} · все клиенты · Asia/Tashkent</p>
				</div>
				<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
					<div className={statCls}>
						<b className="mb-1 block text-[26px] font-bold">{stats.cinemas}</b>
						<span className="text-xs text-muted">Клиентов</span>
					</div>
					<div className={statCls}>
						<b className="mb-1 block text-[26px] font-bold">{stats.ordersPaid}</b>
						<span className="text-xs text-muted">Оплаченных заказов (кол-во)</span>
					</div>
					<div className={statCls}>
						<b className="mb-1 block text-[26px] font-bold">{stats.sessionsToday}</b>
						<span className="text-xs text-muted">Сеансы сегодня (кол-во)</span>
					</div>
					<div className={statCls}>
						<b className="mb-1 block text-[26px] font-bold">{stats.sessionsPublished}</b>
						<span className="text-xs text-muted">Активных сеансов (кол-во)</span>
					</div>
				</div>
				<section className={ui.card}>
					<div className={ui.cardH}>Клиенты и биллинг</div>
					<p className="px-[18px] py-6 text-[13px] leading-relaxed text-muted">
						Управление клиентами, месячными планами, инвойсами, комиссией с билета и авто-lock при
						просрочке.
					</p>
					<div className="flex flex-wrap gap-2 border-t border-line px-4 py-4">
						<Link className={quickLink} href="/clients">
							Клиенты
						</Link>
						<Link className={quickLink} href="/billing">
							Биллинг
						</Link>
						<Link className={quickLink} href="/billing/invoices">
							Инвойсы
						</Link>
						<Link className={quickLink} href="/billing/settings">
							Комиссия
						</Link>
					</div>
				</section>
			</Shell>
		);
	}

	return (
		<Shell user={user}>
			<div className="mb-[18px]">
				<h1>Сегодня</h1>
				<p className={cx(ui.sub, "mb-0")}>
					{todayLabel} · {cinemaName ?? "ваш кинотеатр"} · Asia/Tashkent
				</p>
			</div>

			<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className={statCls}>
					<b className="mb-1 block text-[26px] font-bold">{stats.sessionsToday}</b>
					<span className="text-xs text-muted">Сеансы (сегодня)</span>
				</div>
				<div className={statCls}>
					<b className="mb-1 block text-[26px] font-bold">{stats.ticketsActive}</b>
					<span className="text-xs text-muted">Активные билеты</span>
				</div>
				<div className={statCls}>
					<b className="mb-1 block text-[26px] font-bold">{money(stats.revenueTodayUzs)}</b>
					<span className="text-xs text-muted">Выручка сегодня</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1fr_1fr]">
				<section className={ui.card}>
					<div className={cx(ui.cardH, "flex items-center justify-between gap-3")}>
						<span>Доходы / расходы</span>
						<span className="text-xs font-medium text-muted">Итого: {money(cashflow.netUzs)}</span>
					</div>
					<div className="grid grid-cols-3 gap-2.5 px-4 pt-2">
						<div className={cashPill}>
							<span className="mb-0.5 block text-[11px] text-muted">Доход</span>
							<b className="text-base text-ok">{money(cashflow.incomeUzs)}</b>
						</div>
						<div className={cashPill}>
							<span className="mb-0.5 block text-[11px] text-muted">Расход (refund)</span>
							<b className="text-base text-bad">{money(cashflow.expenseUzs)}</b>
						</div>
						<div className={cashPill}>
							<span className="mb-0.5 block text-[11px] text-muted">Итог</span>
							<b className="text-base text-orange">{money(cashflow.netUzs)}</b>
						</div>
					</div>
					<div className="px-3 pt-2">
						<RevenueChart points={revenueTrend} />
					</div>
					<div className="flex flex-wrap gap-2 border-t border-line px-4 py-4">
						<Link className={quickLink} href="/sessions/new">
							+ Сеанс
						</Link>
						<Link className={quickLink} href="/movies/new">
							+ Фильм
						</Link>
						<Link className={quickLink} href="/halls">
							Залы
						</Link>
						<Link className={quickLink} href="/sessions">
							Все сеансы
						</Link>
					</div>
				</section>

				<section className={cx(ui.card, "flex min-h-[360px] flex-col")}>
					<div className={ui.cardH}>Последние заказы</div>
					{recentOrders.length === 0 ? (
						<p className="px-[18px] py-6 text-[13px] leading-relaxed text-muted">
							Заказов пока нет — после брони в Mini App появятся здесь.
						</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>#</th>
									<th>Фильм</th>
									<th>Клиент</th>
									<th>Сумма</th>
									<th>Статус</th>
								</tr>
							</thead>
							<tbody>
								{recentOrders.map((o) => (
									<tr key={o.id}>
										<td>{o.publicNumber}</td>
										<td>
											{o.movieTitle}
											<br />
											<small className="text-xs text-muted">{o.cinemaName}</small>
										</td>
										<td>{o.customer}</td>
										<td>{money(o.totalUzs)}</td>
										<td>
											<span className={statusClass(o.status)}>{o.status}</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
					<div className="mt-auto flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
						<span>Показаны последние {recentOrders.length || 0}</span>
						<Link className="font-semibold text-orange" href="/orders">
							Ещё
						</Link>
					</div>
				</section>

				<aside className={cx(ui.card, "flex min-h-[360px] flex-col")}>
					<div className={cx(ui.cardH, "flex items-center justify-between gap-3")}>
						<span>Сеансы</span>
						<Link className={cx(ui.btn, ui.btnSm, ui.btnPri)} href="/sessions/new">
							+
						</Link>
					</div>
					{todaySessions.length === 0 ? (
						<p className="px-[18px] py-6 text-[13px] leading-relaxed text-muted">
							Ближайших сеансов нет. Опубликованные сеансы появятся здесь.
						</p>
					) : (
						<ul className="m-0 flex-1 list-none p-0">
							{todaySessions.map((s) => {
								const full = s.occupied >= s.capacity;
								return (
									<li
										key={s.id}
										className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
									>
										<div>
											<strong className="mb-1 block text-[13px]">{s.movieTitle}</strong>
											<small className="text-[11px] leading-snug text-muted">
												{s.cinemaName} · {s.hallName}
												<br />
												{timeLabel(s.startsAt)}
											</small>
										</div>
										<div
											className={cx(
												"inline-flex h-7 items-center gap-1.5 self-center rounded-full px-2.5 text-xs font-bold",
												full ? "bg-bad/12 text-bad" : "bg-ok/12 text-ok",
											)}
										>
											<span className="size-1.5 rounded-full bg-current" />
											{s.occupied}/{s.capacity}
										</div>
									</li>
								);
							})}
						</ul>
					)}
					<div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
						<span>
							{publishedToday}/{todaySessions.length} ближайших сеансов
						</span>
						<Link className="font-semibold text-orange" href="/sessions">
							Ещё
						</Link>
					</div>
				</aside>

				<section className={ui.card}>
					<div className={ui.cardH}>Платежи</div>
					{recentPayments.length === 0 ? (
						<p className="px-[18px] py-6 text-[13px] leading-relaxed text-muted">
							Платежей пока нет (Phase 11 payment).
						</p>
					) : (
						<table>
							<thead>
								<tr>
									<th>Заказ</th>
									<th>Провайдер</th>
									<th>Сумма</th>
									<th>Статус</th>
								</tr>
							</thead>
							<tbody>
								{recentPayments.map((p) => (
									<tr key={p.id}>
										<td>
											#{p.orderNumber}
											<br />
											<small className="text-xs text-muted">{p.cinemaName}</small>
										</td>
										<td>{p.provider}</td>
										<td>{money(p.amountUzs)}</td>
										<td>
											<span className={statusClass(p.status)}>{p.status}</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</section>
			</div>
		</Shell>
	);
}
