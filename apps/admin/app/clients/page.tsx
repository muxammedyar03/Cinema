import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "../../components/button-link";
import { Shell } from "../../components/shell";
import { StatusBadge } from "../../components/status-badge";
import { money } from "../../lib/format";
import { roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { Badge, Card, DataTable, PageHeader } from "../../lib/ui-kit";

type CinemaRow = {
	id: string;
	name: string;
	status: "ACTIVE" | "DISABLED" | "LOCKED";
	timezone: string;
	phone: string | null;
	address: string | null;
	billing: { monthlyPlanUzs: number } | null;
	profileComplete?: boolean;
	_count: { halls: number; staff: number };
	invoices: Array<{ status: string; daysLate?: number }>;
};

export default async function ClientsPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/halls");

	const cinemas = await serverApi<CinemaRow[]>("/admin/cinemas");

	return (
		<Shell user={user}>
			<PageHeader
				title="Клиенты"
				description="Подписчики платформы · план, доступ и администраторы"
				actions={
					<>
						<ButtonLink href="/billing/invoices" variant="secondary">
							Инвойсы
						</ButtonLink>
						<ButtonLink href="/billing" variant="secondary">
							Биллинг
						</ButtonLink>
						<ButtonLink href="/clients/new">
							<Plus className="size-4" strokeWidth={2} />
							Клиент
						</ButtonLink>
					</>
				}
			/>
			<Card>
				<DataTable
					rows={cinemas}
					getRowKey={(cinema) => cinema.id}
					emptyTitle="Клиентов пока нет"
					emptyDescription="Добавьте первого клиента платформы."
					columns={[
						{
							id: "name",
							header: "Клиент",
							cell: (cinema) => (
								<div>
									<Link href={`/clients/${cinema.id}`} className="font-semibold text-ink">
										{cinema.name}
									</Link>
									{cinema.address ? (
										<small className="block text-[11px] text-muted">{cinema.address}</small>
									) : null}
								</div>
							),
						},
						{
							id: "plan",
							header: "План / мес",
							cell: (cinema) => (cinema.billing ? money(cinema.billing.monthlyPlanUzs) : "—"),
						},
						{ id: "halls", header: "Залы", cell: (cinema) => cinema._count.halls },
						{ id: "staff", header: "Админы", cell: (cinema) => cinema._count.staff },
						{ id: "tz", header: "Часовой пояс", cell: (cinema) => cinema.timezone },
						{
							id: "profile",
							header: "Профиль",
							cell: (cinema) => (
								<Link href={`/clients/${cinema.id}/profile`}>
									<Badge tone={cinema.profileComplete ? "ok" : "warn"}>
										{cinema.profileComplete ? "Заполнен" : "Не заполнен"}
									</Badge>
								</Link>
							),
						},
						{
							id: "status",
							header: "Статус",
							cell: (cinema) => <StatusBadge status={cinema.status} />,
						},
					]}
				/>
			</Card>
		</Shell>
	);
}
