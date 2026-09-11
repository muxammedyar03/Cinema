import Link from "next/link";
import { cx, ui } from "../lib/ui";
import { KpiChart } from "./kpi-chart";

export type DashboardKpis = {
	occupancyRate: number | null;
	soldSeats: number;
	sellableSeats: number;
	sessions: number;
	conversionRate: number | null;
	paidOrders: number;
	holdsResolved: number;
	pendingHolds: number;
	gmvUzs: number | null;
	refundRate: number | null;
	refundedAmountUzs: number | null;
	refundedOrders: number;
};

export type KpiTrendPoint = {
	bucket: string;
	occupancyRate: number | null;
	conversionRate: number | null;
	refundRate: number | null;
	gmvUzs: number | null;
	refundedUzs: number | null;
	soldSeats: number;
	sellableSeats: number;
	paidOrders: number;
	holdsResolved: number;
};

const statCls = "rounded-2xl border border-line bg-white/[0.04] px-[18px] py-4";

export function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

export function pct(rate: number | null) {
	if (rate == null) return "—";
	return `${(rate * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
}

export function periodLabel(range: "daily" | "weekly") {
	return range === "weekly" ? "за 8 недель" : "за 7 дней";
}

export function RangeToggle({ active }: { active: "daily" | "weekly" }) {
	return (
		<div className="flex flex-wrap gap-2">
			<Link href="/?range=daily" className={cx(ui.chip, active === "daily" && ui.chipOn)}>
				По дням
			</Link>
			<Link href="/?range=weekly" className={cx(ui.chip, active === "weekly" && ui.chipOn)}>
				По неделям
			</Link>
		</div>
	);
}

function KpiCard({ value, label, hint }: { value: string; label: string; hint: string }) {
	return (
		<div className={statCls}>
			<b className="mb-1 block text-[26px] font-bold">{value}</b>
			<span className="block text-xs text-muted">{label}</span>
			<span className="mt-1 block text-[11px] text-faint">{hint}</span>
		</div>
	);
}

export function KpiWidgets({
	kpis,
	hideMoney,
	range,
}: {
	kpis: DashboardKpis;
	hideMoney: boolean;
	range: "daily" | "weekly";
}) {
	const period = periodLabel(range);
	const cols = hideMoney
		? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
		: "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4";
	return (
		<div className={cols}>
			<KpiCard
				value={pct(kpis.occupancyRate)}
				label={`Заполняемость · ${period}`}
				hint={`${kpis.soldSeats.toLocaleString("ru-RU")} / ${kpis.sellableSeats.toLocaleString("ru-RU")} мест · ${kpis.sessions} сеансов`}
			/>
			<KpiCard
				value={pct(kpis.conversionRate)}
				label={`Hold → оплата · ${period}`}
				hint={`${kpis.paidOrders} оплачено / ${kpis.holdsResolved} закрытых холдов${kpis.pendingHolds ? ` · ${kpis.pendingHolds} в ожидании` : ""}`}
			/>
			{hideMoney ? null : (
				<KpiCard
					value={kpis.gmvUzs == null ? "—" : money(kpis.gmvUzs)}
					label={`GMV · ${period}`}
					hint={`${kpis.paidOrders} оплаченных заказов`}
				/>
			)}
			<KpiCard
				value={pct(kpis.refundRate)}
				label={`Возвраты · ${period}`}
				hint={
					hideMoney || kpis.refundedAmountUzs == null
						? `${kpis.refundedOrders} заказов с возвратом`
						: `${money(kpis.refundedAmountUzs)} · ${kpis.refundedOrders} заказов`
				}
			/>
		</div>
	);
}

function chartLabels(points: KpiTrendPoint[], range: "daily" | "weekly") {
	return points.map((p) => (range === "weekly" ? `нед. ${p.bucket.slice(5)}` : p.bucket.slice(5)));
}

export function KpiCharts({
	points,
	hideMoney,
	range,
}: {
	points: KpiTrendPoint[];
	hideMoney: boolean;
	range: "daily" | "weekly";
}) {
	const labels = chartLabels(points, range);
	return (
		<section className={ui.card}>
			<div className={cx(ui.cardH, "flex items-center justify-between gap-3")}>
				<span>KPI · {periodLabel(range)}</span>
				<RangeToggle active={range} />
			</div>
			<div className={hideMoney ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-2"}>
				{hideMoney ? null : (
					<div className="border-b border-line px-3 pt-2 lg:border-b-0 lg:border-r">
						<p className="px-2 pt-2 text-[11px] text-muted">GMV и возвраты, сум</p>
						<KpiChart
							kind="money"
							ariaLabel="GMV и возвраты"
							labels={labels}
							series={[
								{
									label: "GMV",
									color: "#3dcf8e",
									values: points.map((p) => p.gmvUzs),
								},
								{
									label: "Возвраты",
									color: "#ff5a5a",
									dashed: true,
									values: points.map((p) => p.refundedUzs),
								},
							]}
						/>
					</div>
				)}
				<div className="px-3 pt-2">
					<p className="px-2 pt-2 text-[11px] text-muted">Доли, %</p>
					<KpiChart
						kind="percent"
						ariaLabel="Заполняемость, конверсия и доля возвратов"
						labels={labels}
						series={[
							{
								label: "Заполняемость",
								color: "#3dcf8e",
								values: points.map((p) => p.occupancyRate),
							},
							{
								label: "Hold → оплата",
								color: "#ff6a1a",
								values: points.map((p) => p.conversionRate),
							},
							{
								label: "Возвраты",
								color: "#ff5a5a",
								dashed: true,
								values: points.map((p) => p.refundRate),
							},
						]}
					/>
				</div>
			</div>
			<p className="border-t border-line px-[18px] py-3 text-[11px] leading-relaxed text-faint">
				Заполняемость — SOLD / (места − BLOCKED); для GA — оплаченные билеты / вместимость.
				Конверсия — оплаченные заказы / закрытые холды (без PENDING). GMV — сумма оплаченных заказов
				(gross, до возвратов). Super Admin не видит суммы GMV.
			</p>
		</section>
	);
}
