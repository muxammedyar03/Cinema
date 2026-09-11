import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../../components/shell";
import { assertBillingAccess } from "../../../lib/billing-access";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { displayTicketCode } from "../../../lib/tickets";
import { cx, ui } from "../../../lib/ui";
import { OrderRefundPanel } from "./refund-panel";

type AdminOrder = {
	id: string;
	publicNumber: number;
	status: string;
	totalUzs: number;
	createdAt: string;
	cinema?: { name: string };
	cinemaName?: string;
	session?: {
		startsAt: string;
		movie?: { title: string };
		hall?: { name: string };
	};
	movieTitle?: string;
	customer?: string;
	tickets?: Array<{
		id: string;
		code: string;
		status: string;
		type?: string;
		seatLabel?: string | null;
		usedAt?: string | null;
		unitPriceUzs?: number;
	}>;
};

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

export default async function AdminOrderDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/");
	await assertBillingAccess(user);
	const { id } = await params;

	let order: AdminOrder | null = null;
	try {
		order = await serverApi<AdminOrder>(`/admin/orders/${id}`);
	} catch {
		order = null;
	}

	if (!order) {
		return (
			<Shell user={user}>
				<h1 className={ui.pageTitle}>Заказ</h1>
				<p className={ui.sub}>
					Не удалось загрузить заказ. Нужен GET /admin/orders/:id по контракту.
				</p>
				<Link className={cx(ui.btn, ui.btnGhost, "mt-4")} href="/orders">
					К списку
				</Link>
			</Shell>
		);
	}

	const tickets = order.tickets ?? [];
	const movie = order.session?.movie?.title ?? order.movieTitle ?? "—";
	const cinema = order.cinema?.name ?? order.cinemaName ?? "";

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Заказ #{order.publicNumber}</h1>
					<p className={ui.sub}>
						{movie} · {cinema} · {order.status} · Rahmat only (MVP)
					</p>
				</div>
				<Link className={cx(ui.btn, ui.btnGhost)} href="/m/tickets/verify">
					QR проверка
				</Link>
			</div>
			<div className={ui.card}>
				<div className={ui.cardH}>
					<span>Билеты</span>
					<span className="font-mono text-xs text-muted">{tickets.length}</span>
				</div>
				{tickets.length === 0 ? (
					<p className="px-5 py-6 text-sm text-muted">Билетов пока нет (оплата не подтверждена).</p>
				) : (
					<table>
						<thead>
							<tr>
								<th>Код</th>
								<th>Место</th>
								<th>Статус</th>
							</tr>
						</thead>
						<tbody>
							{tickets.map((t) => (
								<tr key={t.id}>
									<td>{displayTicketCode(t.code)}</td>
									<td>{t.seatLabel ?? t.type ?? "—"}</td>
									<td>
										<span
											className={cx(ui.badge, t.status === "ACTIVE" ? ui.badgeOk : ui.badgeMuted)}
										>
											{t.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
			<div className={ui.card}>
				<div className={ui.cardH}>Возврат (Rahmat)</div>
				<OrderRefundPanel orderId={order.id} tickets={tickets} />
			</div>
			<p className="text-xs text-faint">{money(order.totalUzs)}</p>
		</Shell>
	);
}
