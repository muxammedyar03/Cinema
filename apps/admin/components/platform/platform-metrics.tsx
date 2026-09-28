import { Card, EmptyState, MetricCard } from "@cinema/ui";
import { activeCinemasHint } from "../../lib/platform/format";
import type { LoadState, PlatformSummary } from "../../lib/platform/types";
import styles from "./platform.module.css";

export function PlatformMetrics({ state }: { state: LoadState<PlatformSummary> }) {
	if (state.status === "unavailable") {
		return (
			<div className={styles.block}>
				<Card>
					<EmptyState
						title="Сводка платформы недоступна"
						description="Числа по кинотеатрам, залам, администраторам и неоплаченным подпискам появятся после подключения сводки. Пока показатели не показываем."
					/>
				</Card>
			</div>
		);
	}
	if (state.status === "error") {
		return (
			<div className={styles.block}>
				<Card>
					<EmptyState title="Не удалось загрузить сводку" description={state.message} />
				</Card>
			</div>
		);
	}

	const data = state.data;
	return (
		<div className={styles.metrics}>
			<MetricCard
				variant="primary"
				label="Кинотеатров"
				value={data.cinemas}
				hint={activeCinemasHint(data.cinemasActive)}
			/>
			<MetricCard label="Залов" value={data.halls} hint="На платформе" />
			<MetricCard label="Администраторов" value={data.cinemaAdmins} hint="Подключённые команды" />
			<MetricCard label="Подписки к оплате" value={data.invoicesUnpaid} hint="Проверьте биллинг" />
		</div>
	);
}
