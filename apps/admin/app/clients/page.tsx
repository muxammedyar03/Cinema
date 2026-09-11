import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "../../components/shell";
import { roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";
import { cx, ui } from "../../lib/ui";

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

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

function statusCls(status: string) {
	if (status === "ACTIVE") return cx(ui.badge, ui.badgeOk);
	if (status === "LOCKED") return cx(ui.badge, ui.badgeBad);
	return cx(ui.badge, ui.badgeMuted);
}

export default async function ClientsPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/halls");

	const cinemas = await serverApi<CinemaRow[]>("/admin/cinemas");

	return (
		<Shell user={user}>
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Клиенты</h1>
					<p className={ui.sub}>Подписчики платформы · план, доступ, админы · без кассы клиента</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Link className={cx(ui.btn, ui.btnGhost)} href="/billing/invoices">
						Инвойсы
					</Link>
					<Link className={cx(ui.btn, ui.btnGhost)} href="/billing">
						Биллинг
					</Link>
					<Link className={cx(ui.btn, ui.btnPri)} href="/clients/new">
						<Plus className="size-4" strokeWidth={2} />
						Клиент
					</Link>
				</div>
			</div>

			<div className={ui.card}>
				{cinemas.length === 0 ? (
					<div className="px-5 py-10 text-center text-sm text-muted">
						<Building2 className="mx-auto mb-3 size-8 text-faint" strokeWidth={1.4} />
						Клиентов пока нет
					</div>
				) : (
					<table>
						<thead>
							<tr>
								<th>Клиент</th>
								<th>План / мес</th>
								<th>Залы</th>
								<th>Админы</th>
								<th>Часовой пояс</th>
								<th>Профиль</th>
								<th>Статус</th>
							</tr>
						</thead>
						<tbody>
							{cinemas.map((c) => (
								<tr key={c.id}>
									<td>
										<Link href={`/clients/${c.id}`}>
											<b>{c.name}</b>
										</Link>
										{c.address ? (
											<>
												<br />
												<small className="text-xs text-muted">{c.address}</small>
											</>
										) : null}
									</td>
									<td>{money(c.billing?.monthlyPlanUzs ?? 2_500_000)}</td>
									<td>{c._count.halls}</td>
									<td>{c._count.staff}</td>
									<td>{c.timezone}</td>
									<td>
										<Link href={`/clients/${c.id}/profile`}>
											<span className={cx(ui.badge, c.profileComplete ? ui.badgeOk : ui.badgeWarn)}>
												{c.profileComplete ? "полный" : "неполный"}
											</span>
										</Link>
									</td>
									<td>
										<span className={statusCls(c.status)}>{c.status}</span>
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
