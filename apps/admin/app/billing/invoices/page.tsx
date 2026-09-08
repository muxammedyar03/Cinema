import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../../components/shell";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { cx, ui } from "../../../lib/ui";
import { InvoiceRowActions } from "./invoice-row-actions";

type Invoice = {
	id: string;
	publicNumber: string;
	cinemaId: string;
	cinemaName: string;
	cinemaStatus: string;
	periodYear: number;
	periodMonth: number;
	amountUzs: number;
	status: string;
	dueAt: string;
	paidAt: string | null;
	daysLate: number;
};

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

export default async function InvoicesPage({
	searchParams,
}: {
	searchParams: Promise<{ cinemaId?: string; status?: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	const { cinemaId, status } = await searchParams;
	const invoices = await serverApi<Invoice[]>("/admin/billing/invoices");
	const filtered = invoices.filter((inv) => {
		if (cinemaId && inv.cinemaId !== cinemaId) return false;
		if (status && status !== "ALL" && inv.status !== status) return false;
		return true;
	});

	const statuses = ["ALL", "DUE", "OVERDUE", "PAID", "VOID"] as const;

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Инвойсы</h1>
					<p className={ui.sub}>
						Ежемесячные счета подписки
						{cinemaId ? " · фильтр по клиенту" : ""} · история оплат
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Link className={cx(ui.btn, ui.btnGhost)} href="/billing">
						Биллинг
					</Link>
					<Link className={cx(ui.btn, ui.btnGhost)} href="/clients">
						Клиенты
					</Link>
				</div>
			</div>

			<div className="mb-4 flex flex-wrap gap-2">
				{statuses.map((s) => (
					<Link
						key={s}
						href={
							cinemaId
								? `/billing/invoices?status=${s}&cinemaId=${cinemaId}`
								: `/billing/invoices?status=${s}`
						}
						className={cx(ui.chip, (status ?? "ALL") === s && ui.chipOn)}
					>
						{s === "ALL" ? "Все" : s}
					</Link>
				))}
				{cinemaId ? (
					<Link href="/billing/invoices" className={cx(ui.chip, "text-orange")}>
						Сбросить клиент
					</Link>
				) : null}
			</div>

			<div className={ui.card}>
				<div className={ui.cardH}>
					<span>Список</span>
					<span className="font-mono text-xs text-muted">{filtered.length}</span>
				</div>
				{filtered.length === 0 ? (
					<p className="px-[18px] py-8 text-center text-sm text-muted">Инвойсов нет</p>
				) : (
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>Клиент</th>
								<th>Период</th>
								<th>Сумма</th>
								<th>Статус</th>
								<th>Due</th>
								<th>Просрочка</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.map((inv) => (
								<tr key={inv.id}>
									<td>{inv.publicNumber}</td>
									<td>
										<Link href={`/clients/${inv.cinemaId}`}>
											<b>{inv.cinemaName}</b>
										</Link>
										<br />
										<small className="text-xs text-muted">{inv.cinemaStatus}</small>
									</td>
									<td>
										{inv.periodMonth}/{inv.periodYear}
									</td>
									<td>{money(inv.amountUzs)}</td>
									<td>
										<span
											className={cx(
												ui.badge,
												inv.status === "PAID"
													? ui.badgeOk
													: inv.status === "OVERDUE"
														? ui.badgeBad
														: ui.badgeWarn,
											)}
										>
											{inv.status}
										</span>
									</td>
									<td>
										{new Date(inv.dueAt).toLocaleDateString("ru-RU", {
											timeZone: "Asia/Tashkent",
										})}
									</td>
									<td>{inv.daysLate > 0 ? `${inv.daysLate} дн.` : "—"}</td>
									<td className="text-right">
										<InvoiceRowActions
											invoiceId={inv.id}
											status={inv.status}
											cinemaId={inv.cinemaId}
										/>
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
