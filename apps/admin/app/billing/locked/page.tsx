import { buttonClassName, Card, CardBody } from "@cinema/ui";
import { redirect } from "next/navigation";
import { LogoutButton } from "../../../components/logout-button";
import styles from "../../../components/platform/platform.module.css";
import { RahmatSubscriptionPay } from "../../../components/rahmat-subscription-pay";
import { formatMoneyUzs } from "../../../lib/platform/format";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";

type Access =
	| { locked: false }
	| {
			locked: true;
			cinemaName: string;
			lockAfterDays: number;
			invoice: {
				id: string;
				publicNumber: string;
				amountUzs: number;
				dueAt: string;
				daysLate: number;
				status: string;
			} | null;
	  };

export default async function BillingLockedPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/");

	const access = await serverApi<Access>("/admin/billing/access");
	if (!access.locked) redirect("/");

	return (
		<div className={styles.lockWrap}>
			<Card className={styles.lockCard}>
				<CardBody>
					<h1 className={styles.lockTitle}>Подписка просрочена</h1>
					<p className={styles.lockText}>
						Доступ к панели кинотеатра временно закрыт из‑за неоплаченной подписки. Продажи, сеансы
						и отчёты недоступны, пока счёт не будет оплачен.
					</p>
					<div className={styles.rows}>
						<div className={styles.row}>
							<span>Кинотеатр</span>
							<b>{access.cinemaName}</b>
						</div>
						{access.invoice ? (
							<>
								<div className={styles.row}>
									<span>Счёт</span>
									<b>
										{access.invoice.publicNumber} · {formatMoneyUzs(access.invoice.amountUzs)}
									</b>
								</div>
								<div className={styles.row}>
									<span>Просрочка</span>
									<b>{access.invoice.daysLate} дн.</b>
								</div>
							</>
						) : null}
						<div className={styles.row}>
							<span>Порог автоблокировки</span>
							<b>{access.lockAfterDays} дней</b>
						</div>
					</div>
					<div className={styles.stack}>
						{access.invoice ? <RahmatSubscriptionPay invoiceId={access.invoice.id} /> : null}
						<a
							className={buttonClassName({ variant: "secondary", className: styles.full })}
							href="mailto:support@cinema.local?subject=Нужна%20помощь%20по%20подписке"
						>
							Написать в поддержку
						</a>
						<LogoutButton
							className={buttonClassName({ variant: "secondary", className: styles.full })}
						/>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
