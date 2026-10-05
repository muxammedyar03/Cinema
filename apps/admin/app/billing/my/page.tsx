import { Card, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { RahmatSubscriptionPay } from "../../../components/rahmat-subscription-pay";
import { Shell } from "../../../components/shell";
import { formatMoneyUzs, invoiceStatusLabel } from "../../../lib/platform/format";
import { getMe, serverApi } from "../../../lib/server-api";
export default async function MySubscriptionPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	const result = await serverApi<{
		enabled: boolean;
		invoices: Array<{
			id: string;
			cinemaName: string;
			publicNumber: string;
			amountUzs: number;
			status: string;
			dueAt: string;
		}>;
	}>("/admin/billing/my-invoices");
	return (
		<Shell user={user}>
			<PageHeader title="Подписка" description="Счета за использование платформы Cinema" />
			{result.invoices.map((invoice) => (
				<Card key={invoice.id}>
					<div className="p-4 space-y-3">
						<h2>
							{invoice.cinemaName} · {invoice.publicNumber}
						</h2>
						<p>
							{formatMoneyUzs(invoice.amountUzs)} · {invoiceStatusLabel(invoice.status)}
						</p>
						{result.enabled && !["PAID", "VOID"].includes(invoice.status) ? (
							<RahmatSubscriptionPay invoiceId={invoice.id} />
						) : null}
					</div>
				</Card>
			))}
		</Shell>
	);
}
