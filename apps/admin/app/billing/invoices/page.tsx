import { Card, EmptyState, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { ButtonLink } from "../../../components/platform/button-link";
import { InvoiceStatusFilter } from "../../../components/platform/invoice-filters";
import { InvoicesTable } from "../../../components/platform/invoices-table";
import styles from "../../../components/platform/platform.module.css";
import { Shell } from "../../../components/shell";
import { loadInvoices } from "../../../lib/platform/load";
import { roleOf } from "../../../lib/rbac";
import { getMe } from "../../../lib/server-api";

export default async function InvoicesPage({
	searchParams,
}: {
	searchParams: Promise<{ cinemaId?: string; status?: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	const { cinemaId, status } = await searchParams;
	const invoices = await loadInvoices();
	const rows =
		invoices.status === "ready"
			? invoices.data.filter((invoice) => {
					if (cinemaId && invoice.cinemaId !== cinemaId) return false;
					if (status && status !== "ALL" && invoice.status !== status) return false;
					return true;
				})
			: [];

	return (
		<Shell user={user}>
			<PageHeader
				title="Счета"
				description={
					cinemaId
						? "Ежемесячные счета подписки · фильтр по кинотеатру"
						: "Ежемесячные счета подписки"
				}
				actions={
					<>
						<ButtonLink href="/billing" variant="secondary">
							Биллинг
						</ButtonLink>
						<ButtonLink href="/cinemas" variant="secondary">
							Кинотеатры
						</ButtonLink>
					</>
				}
			/>
			<InvoiceStatusFilter status={status ?? "ALL"} cinemaId={cinemaId} />
			{cinemaId ? (
				<div className={styles.block}>
					<ButtonLink href="/billing/invoices" variant="secondary" size="small">
						Сбросить кинотеатр
					</ButtonLink>
				</div>
			) : null}
			{invoices.status === "ready" ? (
				<InvoicesTable rows={rows} />
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
