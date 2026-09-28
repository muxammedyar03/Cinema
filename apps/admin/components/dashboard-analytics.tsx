import { money, pct, periodLabel } from "../lib/format";
import { Card, CardHeader, MetricCard } from "../lib/ui-kit";
import { KpiChart } from "./kpi-chart";
import { RangeToggle } from "./range-toggle";

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

export { money, pct, periodLabel };

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
	return (
		<div
			className={
				hideMoney
					? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
					: "mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
			}
		>
			<MetricCard
				label={`Заполняемость · ${period}`}
				value={pct(kpis.occupancyRate)}
				hint={`${kpis.soldSeats.toLocaleString("ru-RU")} / ${kpis.sellableSeats.toLocaleString("ru-RU")} мест · ${kpis.sessions} сеансов`}
			/>
			<MetricCard
				label={`Холд → оплата · ${period}`}
				value={pct(kpis.conversionRate)}
				hint={`${kpis.paidOrders} оплачено / ${kpis.holdsResolved} закрытых холдов${kpis.pendingHolds ? ` · ${kpis.pendingHolds} в ожидании` : ""}`}
			/>
			{hideMoney ? null : (
				<MetricCard
					label={`GMV · ${period}`}
					value={kpis.gmvUzs == null ? "—" : money(kpis.gmvUzs)}
					hint={`${kpis.paidOrders} оплаченных заказов`}
				/>
			)}
			<MetricCard
				label={`Возвраты · ${period}`}
				value={pct(kpis.refundRate)}
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
	return points.map((point) =>
		range === "weekly" ? `нед. ${point.bucket.slice(5)}` : point.bucket.slice(5),
	);
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
		<Card className="mb-6">
			<CardHeader
				title={`Показатели · ${periodLabel(range)}`}
				extra={<RangeToggle active={range} />}
			/>
			<div className={hideMoney ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-2"}>
				{hideMoney ? null : (
					<div className="border-b border-line px-3 pt-2 lg:border-b-0 lg:border-r">
						<p className="px-2 pt-2 text-[11px] text-muted">GMV и возвраты, сум</p>
						<KpiChart
							kind="money"
							ariaLabel="GMV и возвраты"
							labels={labels}
							series={[
								{ label: "GMV", color: "var(--ok)", values: points.map((point) => point.gmvUzs) },
								{
									label: "Возвраты",
									color: "var(--bad)",
									dashed: true,
									values: points.map((point) => point.refundedUzs),
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
								color: "var(--ok)",
								values: points.map((point) => point.occupancyRate),
							},
							{
								label: "Холд → оплата",
								color: "var(--primary)",
								values: points.map((point) => point.conversionRate),
							},
							{
								label: "Возвраты",
								color: "var(--bad)",
								dashed: true,
								values: points.map((point) => point.refundRate),
							},
						]}
					/>
				</div>
			</div>
			<p className="border-t border-line px-[18px] py-3 text-[11px] leading-relaxed text-faint">
				Заполняемость — проданные места / (места − заблокированные); для продажи без мест —
				оплаченные билеты / вместимость. Конверсия — оплаченные заказы / закрытые холды (без
				ожидающих). GMV — сумма оплаченных заказов до возвратов. Суперадминистратор не видит суммы
				GMV.
			</p>
		</Card>
	);
}
