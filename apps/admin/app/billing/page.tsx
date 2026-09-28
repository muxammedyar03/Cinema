import { Card, EmptyState, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { ButtonLink } from "../../components/platform/button-link";
import { InvoicesTable } from "../../components/platform/invoices-table";
import { Shell } from "../../components/shell";
import { loadInvoices } from "../../lib/platform/load";
import { roleOf } from "../../lib/rbac";
import { getMe } from "../../lib/server-api";

export default async function BillingPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	const invoices = await loadInvoices();

	return (
		<Shell user={user}>
			<PageHeader
				title="Биллинг"
				description="Подписки кинотеатров · без выручки и заказов клиентов"
				actions={
					<>
						<ButtonLink href="/billing/settings" variant="secondary">
							Комиссия и уведомления
						</ButtonLink>
						<ButtonLink href="/billing/invoices" variant="secondary">
							Все счета
						</ButtonLink>
					</>
				}
			/>
			{invoices.status === "ready" ? (
				<InvoicesTable rows={invoices.data} />
			) : (
				<Card>
					<EmptyState
						title="Не удалось загрузить счета"
						description={
							invoices.status === "error" ? invoices.message : "Список временно недоступен."
						}
					/>
				</Card>
			)}
		</Shell>
	);
}
