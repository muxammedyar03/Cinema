import {
	Badge,
	Card,
	CardBody,
	CardHeader,
	DataTable,
	EmptyState,
	MetricCard,
	PageHeader,
} from "@cinema/ui";
import { ClientActions } from "../../app/clients/client-actions";
import { MarkInvoicePaidButton } from "../../app/clients/mark-paid-button";
import {
	cinemaOperationalLabel,
	cinemaStatusTone,
	formatDueDate,
	formatMoneyUzs,
	formatPeriod,
	invoiceStatusLabel,
	invoiceStatusTone,
	personName,
	profileMissingLabel,
	roleLabel,
} from "../../lib/platform/format";
import type { CinemaDossier, ProfileBanner } from "../../lib/platform/types";
import { ButtonLink } from "./button-link";
import styles from "./platform.module.css";

export function CinemaDossierView({
	dossier,
	profile,
}: {
	dossier: CinemaDossier;
	profile: ProfileBanner | null;
}) {
	const meta = [dossier.address, dossier.phone, dossier.timezone].filter(Boolean).join(" · ");
	const awaiting = profile?.profileComplete === false;
	const missing = profile ? profileMissingLabel(profile.missing) : "";

	return (
		<>
			<PageHeader
				title={dossier.name}
				description={meta || "Кинотеатр платформы"}
				actions={
					<div className={styles.actions}>
						<Badge
							tone={cinemaStatusTone({
								status: dossier.status,
								profileComplete: !awaiting,
							})}
						>
							{awaiting ? "Ожидает подключения" : cinemaOperationalLabel(dossier.status)}
						</Badge>
						<ClientActions clientId={dossier.id} status={dossier.status} />
					</div>
				}
			/>

			{awaiting ? (
				<div className={styles.notice}>
					<div>
						<b>Профиль кинотеатра не заполнен</b>
						<p>{missing ? `Осталось: ${missing}` : "Остались шаги мастера"}</p>
					</div>
					<ButtonLink href={`/clients/${dossier.id}/profile`}>Заполнить профиль</ButtonLink>
				</div>
			) : null}

			<div className={styles.statGrid}>
				<MetricCard label="Залы" value={dossier.stats.halls} />
				<MetricCard label="Активные сеансы" value={dossier.stats.activeSessions} />
				<MetricCard label="Заказы сегодня" value={dossier.stats.ordersToday} />
				<MetricCard label="Заказов всего" value={dossier.stats.ordersTotal} />
				<MetricCard label="Оплаченные счета" value={dossier.stats.paidInvoices} />
				<MetricCard label="Открытые счета" value={dossier.stats.openInvoices} />
			</div>

			<div className={styles.split}>
				<Card>
					<CardHeader
						title="Подписка и комиссия"
						extra={
							<ButtonLink href={`/clients/${dossier.id}/edit`} variant="secondary" size="small">
								Изменить
							</ButtonLink>
						}
					/>
					<div className={styles.rows}>
						<div className={styles.row}>
							<span>План / месяц</span>
							<b>{formatMoneyUzs(dossier.billing.monthlyPlanUzs)}</b>
						</div>
						<div className={styles.row}>
							<span>Комиссия / билет</span>
							<b>
								{formatMoneyUzs(dossier.billing.commissionPerTicketUzs)}
								<span className={styles.sub}>
									{dossier.billing.commissionIsOverride ? "своё значение" : "значение по умолчанию"}
								</span>
							</b>
						</div>
						<div className={styles.row}>
							<span>Текущий счёт</span>
							{dossier.currentInvoice ? (
								<b>
									<Badge tone={invoiceStatusTone(dossier.currentInvoice.status)}>
										{invoiceStatusLabel(dossier.currentInvoice.status)}
									</Badge>
									<span className={styles.sub}>
										{dossier.currentInvoice.publicNumber} ·{" "}
										{formatMoneyUzs(dossier.currentInvoice.amountUzs)}
									</span>
								</b>
							) : (
								<b>—</b>
							)}
						</div>
						<div className={styles.row}>
							<span>Просрочка / автоблокировка</span>
							<b>
								{dossier.currentInvoice && dossier.currentInvoice.daysLate > 0
									? `${dossier.currentInvoice.daysLate} дн.`
									: "0 дн."}
								<span className={styles.sub}>порог {dossier.billing.lockAfterDays} дн.</span>
							</b>
						</div>
					</div>
				</Card>

				<Card>
					<CardHeader title="Администраторы" />
					{dossier.admins.length === 0 ? (
						<EmptyState
							title="Администраторов пока нет"
							description="Первый администратор создаётся вместе с кинотеатром."
						/>
					) : (
						<DataTable
							columns={[
								{ id: "email", header: "Электронная почта", cell: (row) => row.email ?? "—" },
								{
									id: "name",
									header: "Имя",
									cell: (row) => personName(row.firstName, row.lastName),
								},
								{ id: "role", header: "Роль", cell: (row) => roleLabel(row.role) },
							]}
							rows={dossier.admins}
							getRowKey={(row) => row.staffId}
						/>
					)}
				</Card>
			</div>

			<Card>
				<CardHeader
					title="Счета и оплаты"
					extra={
						<ButtonLink
							href={`/billing/invoices?cinemaId=${dossier.id}`}
							variant="secondary"
							size="small"
						>
							Все счета
						</ButtonLink>
					}
				/>
				<DataTable
					columns={[
						{ id: "number", header: "Счёт", cell: (row) => row.publicNumber },
						{
							id: "period",
							header: "Период",
							cell: (row) => formatPeriod(row.periodYear, row.periodMonth),
						},
						{ id: "amount", header: "Сумма", cell: (row) => formatMoneyUzs(row.amountUzs) },
						{
							id: "status",
							header: "Статус",
							cell: (row) => (
								<Badge tone={invoiceStatusTone(row.status)}>{invoiceStatusLabel(row.status)}</Badge>
							),
						},
						{ id: "due", header: "Срок", cell: (row) => formatDueDate(row.dueAt) },
						{
							id: "paid",
							header: "Оплачен",
							cell: (row) => (row.paidAt ? formatDueDate(row.paidAt) : "—"),
						},
						{
							id: "late",
							header: "Просрочка",
							cell: (row) => (row.daysLate > 0 ? `${row.daysLate} дн.` : "—"),
						},
						{
							id: "actions",
							header: "",
							cell: (row) =>
								row.status !== "PAID" && row.status !== "VOID" ? (
									<MarkInvoicePaidButton invoiceId={row.id} />
								) : null,
						},
					]}
					rows={dossier.invoices}
					getRowKey={(row) => row.id}
					emptyTitle="Счетов пока нет"
					emptyDescription="Счета этой подписки появятся здесь."
				/>
			</Card>

			{dossier.description ? (
				<div className={styles.spaced}>
					<Card>
						<CardHeader title="Описание" />
						<CardBody>
							<p className={styles.lead}>{dossier.description}</p>
						</CardBody>
					</Card>
				</div>
			) : null}
		</>
	);
}
