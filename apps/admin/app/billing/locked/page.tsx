import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { LogoutButton } from "../../../components/logout-button";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { cx, ui } from "../../../lib/ui";

type Access =
	| { locked: false }
	| {
			locked: true;
			cinemaName: string;
			lockAfterDays: number;
			invoice: {
				publicNumber: string;
				amountUzs: number;
				dueAt: string;
				daysLate: number;
				status: string;
			} | null;
	  };

function money(n: number) {
	return `${n.toLocaleString("ru-RU")} сум`;
}

export default async function BillingLockedPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/");

	const access = await serverApi<Access>("/admin/billing/access");
	if (!access.locked) redirect("/");

	return (
		<div className="grid min-h-screen place-items-center px-6 py-12">
			<div className="w-full max-w-[520px] rounded-[18px] border border-bad/35 bg-surface px-8 py-9 text-center">
				<div className="mx-auto mb-[18px] grid size-14 place-items-center rounded-2xl bg-bad/14 text-bad">
					<Lock className="size-6" strokeWidth={1.8} />
				</div>
				<h1 className="mb-2.5 font-brand text-[22px] font-extrabold tracking-tight">
					Подписка просрочена
				</h1>
				<p className="mb-[18px] text-sm leading-relaxed text-muted">
					Доступ к панели кинотеатра временно закрыт из‑за неоплаченной подписки. Продажи, сеансы и
					отчёты недоступны, пока не будет оплачен инвойс.
				</p>
				<div className="mb-5 rounded-xl border border-line bg-elev px-4 py-3.5 text-left text-[13px]">
					<div className="flex justify-between gap-3 py-1.5 text-muted">
						<span>Клиент</span>
						<b className="font-semibold text-ink">{access.cinemaName}</b>
					</div>
					{access.invoice ? (
						<>
							<div className="flex justify-between gap-3 py-1.5 text-muted">
								<span>Инвойс</span>
								<b className="font-semibold text-ink">
									{access.invoice.publicNumber} · {money(access.invoice.amountUzs)}
								</b>
							</div>
							<div className="flex justify-between gap-3 py-1.5 text-muted">
								<span>Просрочка</span>
								<b className="font-semibold text-bad">{access.invoice.daysLate} дн.</b>
							</div>
						</>
					) : null}
					<div className="flex justify-between gap-3 py-1.5 text-muted">
						<span>Порог авто-lock</span>
						<b className="font-semibold text-ink">{access.lockAfterDays} дней</b>
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<a
						className={cx(ui.btn, ui.btnPri, "w-full justify-center")}
						href="mailto:billing@cinema.local?subject=Оплата%20подписки"
					>
						Перейти к оплате
					</a>
					<a
						className={cx(ui.btn, ui.btnGhost, "w-full justify-center")}
						href="mailto:support@cinema.local?subject=Нужна%20помощь%20по%20подписке"
					>
						Нужна помощь? Написать в поддержку
					</a>
					<div className="pt-2">
						<LogoutButton className="w-full justify-center rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold text-muted no-underline hover:border-muted hover:text-ink" />
					</div>
				</div>
			</div>
		</div>
	);
}
