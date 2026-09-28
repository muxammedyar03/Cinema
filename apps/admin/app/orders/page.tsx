import Link from "next/link";
import { redirect } from "next/navigation";
import { QuerySearch } from "../../components/query-search";
import { Shell } from "../../components/shell";
import { StatusBadge } from "../../components/status-badge";
import { assertBillingAccess } from "../../lib/billing-access";
import { money, tashkentDate } from "../../lib/format";
import { roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { Card, DataTable, PageHeader } from "../../lib/ui-kit";
import { OrderFilters } from "./order-filters";

type OrderRow = {
	id: string;
	publicNumber: number;
	status: string;
	totalUzs: number;
	createdAt: string;
	cinemaName: string;
	movieTitle: string;
	ticketCount: number;
	customer: string;
};

export default async function OrdersPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string; q?: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/");
	await assertBillingAccess(user);

	const { status, q } = await searchParams;
	const orders = await serverApi<OrderRow[]>("/admin/orders");
	const query = (q ?? "").trim().toLowerCase();
	const filtered = orders.filter((order) => {
		if (status && status !== "ALL" && order.status !== status) return false;
		if (!query) return true;
		return [String(order.publicNumber), order.movieTitle, order.customer, order.cinemaName]
			.join(" ")
			.toLowerCase()
			.includes(query);
	});

	return (
		<Shell user={user}>
			<PageHeader title="Заказы" description="Платежи и билеты вашего кинотеатра" />
			<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<OrderFilters active={status ?? "ALL"} />
				<QuerySearch placeholder="Поиск по номеру или имени" initial={q ?? ""} />
			</div>
			<Card>
				<DataTable
					rows={filtered}
					getRowKey={(order) => order.id}
					emptyTitle="Заказов пока нет"
					emptyDescription={
						query || (status && status !== "ALL")
							? "Ничего не найдено по этому фильтру."
							: "Заказы появятся после брони."
					}
					columns={[
						{
							id: "number",
							header: "Заказ",
							cell: (order) => (
								<Link href={`/orders/${order.id}`} className="font-semibold text-ink">
									#{order.publicNumber}
								</Link>
							),
						},
						{
							id: "movie",
							header: "Фильм",
							cell: (order) => (
								<div>
									<strong className="text-ink">{order.movieTitle}</strong>
									<small className="block text-[11px] text-muted">{order.cinemaName}</small>
								</div>
							),
						},
						{ id: "customer", header: "Покупатель", cell: (order) => order.customer },
						{ id: "tickets", header: "Билеты", cell: (order) => order.ticketCount },
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
							id: "created",
							header: "Создан",
							cell: (order) => tashkentDate(order.createdAt, true),
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
		</Shell>
	);
}
