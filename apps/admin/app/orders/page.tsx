import { ListOrdered } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../components/shell";
import { assertBillingAccess } from "../../lib/billing-access";
import { roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { cx, ui } from "../../lib/ui";

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

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

function statusClass(status: string) {
	if (status === "PAID") return cx(ui.badge, ui.badgeOk);
	if (status === "PENDING_PAYMENT" || status === "REFUND_PENDING")
		return cx(ui.badge, ui.badgeWarn);
	if (status === "EXPIRED" || status === "CANCELLED" || status === "REFUNDED") {
		return cx(ui.badge, ui.badgeMuted);
	}
	return cx(ui.badge, ui.badgeMuted);
}

export default async function OrdersPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/");
	await assertBillingAccess(user);

	const orders = await serverApi<OrderRow[]>("/admin/orders");

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Заказы</h1>
					<p className={ui.sub}>Заказы вашего кинотеатра · SEAT и GA</p>
				</div>
			</div>
			<div className={ui.card}>
				<div className={ui.cardH}>
					<span>Список</span>
					<span className="font-mono text-xs font-medium text-muted">{orders.length}</span>
				</div>
				{orders.length === 0 ? (
					<div className="px-5 py-10 text-center text-sm text-muted">
						<ListOrdered className="mx-auto mb-3 size-8 text-faint" strokeWidth={1.4} />
						Заказов пока нет
					</div>
				) : (
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>Фильм</th>
								<th>Клиент</th>
								<th>Билеты</th>
								<th>Сумма</th>
								<th>Статус</th>
								<th>Создан</th>
							</tr>
						</thead>
						<tbody>
							{orders.map((o) => (
								<tr key={o.id} className="clickable">
									<td>
										<Link href={`/orders/${o.id}`}>{o.publicNumber}</Link>
									</td>
									<td>
										<b>{o.movieTitle}</b>
										<br />
										<small className="text-xs text-muted">{o.cinemaName}</small>
									</td>
									<td>{o.customer}</td>
									<td>{o.ticketCount}</td>
									<td>{money(o.totalUzs)}</td>
									<td>
										<span className={statusClass(o.status)}>{o.status}</span>
									</td>
									<td>
										{new Date(o.createdAt).toLocaleString("ru-RU", {
											timeZone: "Asia/Tashkent",
											day: "numeric",
											month: "short",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</Shell>
	);
}
