import { Card, EmptyState, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { ButtonLink } from "../../components/platform/button-link";
import { CinemaTable } from "../../components/platform/cinema-table";
import { PlatformMetrics } from "../../components/platform/platform-metrics";
import { Shell } from "../../components/shell";
import { loadCinemas, loadPlatformSummary } from "../../lib/platform/load";
import { roleOf } from "../../lib/rbac";
import { getMe } from "../../lib/server-api";

export default async function CinemasPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/halls");

	const [summary, cinemas] = await Promise.all([loadPlatformSummary(), loadCinemas()]);

	return (
		<Shell user={user}>
			<PageHeader
				title="Кинотеатры"
				description="Обзор платформы · данные заказов клиентов скрыты"
				actions={
					<>
						<ButtonLink href="/billing" variant="secondary">
							Биллинг
						</ButtonLink>
						<ButtonLink href="/cinemas/new">Кинотеатр</ButtonLink>
					</>
				}
			/>
			<PlatformMetrics state={summary} />
			{cinemas.status === "ready" ? (
				<CinemaTable rows={cinemas.data} />
			) : (
				<Card>
					<EmptyState
						title="Не удалось загрузить кинотеатры"
						description={
							cinemas.status === "error" ? cinemas.message : "Список временно недоступен."
						}
					/>
				</Card>
			)}
		</Shell>
	);
}
