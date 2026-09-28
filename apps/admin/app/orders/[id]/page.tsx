import { redirect } from "next/navigation";
import { ButtonLink } from "../../../components/button-link";
import { Shell } from "../../../components/shell";
import { StatusBadge } from "../../../components/status-badge";
import { assertBillingAccess } from "../../../lib/billing-access";
import { money } from "../../../lib/format";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { displayTicketCode } from "../../../lib/tickets";
import { Card, CardHeader, DataTable, EmptyState, PageHeader } from "../../../lib/ui-kit";
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
				<PageHeader title="Заказ" description="Не удалось загрузить заказ." />
				<Card>
					<EmptyState
						title="Заказ недоступен"
						description="Сервер не вернул карточку заказа. Проверьте соединение и попробуйте снова."
						action={
							<ButtonLink href="/orders" variant="secondary">
								К списку
							</ButtonLink>
						}
					/>
				</Card>
			</Shell>
		);
	}

	const tickets = order.tickets ?? [];
	const movie = order.session?.movie?.title ?? order.movieTitle ?? "—";
	const cinema = order.cinema?.name ?? order.cinemaName ?? "";

	return (
		<Shell user={user}>
			<PageHeader
				title={`Заказ #${order.publicNumber}`}
				description={`${movie}${cinema ? ` · ${cinema}` : ""} · ${money(order.totalUzs)}`}
				actions={
					<>
						<StatusBadge status={order.status} />
						<ButtonLink href="/m/tickets/verify" variant="secondary">
							Проверка билетов
						</ButtonLink>
					</>
				}
			/>
			<Card className="mb-6">
				<CardHeader
					title="Билеты"
					extra={<span className="text-xs text-muted">{tickets.length}</span>}
				/>
				<DataTable
					rows={tickets}
					getRowKey={(ticket) => ticket.id}
					emptyTitle="Билетов пока нет"
					emptyDescription="Оплата ещё не подтверждена."
					columns={[
						{
							id: "code",
							header: "Код",
							cell: (ticket) => displayTicketCode(ticket.code),
						},
						{
							id: "seat",
							header: "Место",
							cell: (ticket) => ticket.seatLabel ?? ticket.type ?? "—",
						},
						{
							id: "status",
							header: "Статус",
							cell: (ticket) => <StatusBadge status={ticket.status} />,
						},
					]}
				/>
			</Card>
			<Card>
				<CardHeader title="Возврат" />
				<OrderRefundPanel orderId={order.id} tickets={tickets} />
			</Card>
		</Shell>
	);
}
