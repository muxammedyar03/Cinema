import { Card, EmptyState, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { CinemaDirectory } from "../../components/platform/cinema-directory";
import { NewClientAction } from "../../components/platform/new-client-action";
import { PlatformMetrics } from "../../components/platform/platform-metrics";
import { Shell } from "../../components/shell";
import { loadCinemas, loadPlatformSummary } from "../../lib/platform/load";
import { roleOf } from "../../lib/rbac";
import { getMe } from "../../lib/server-api";

export default async function ClientsPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/halls");

	const [summary, cinemas] = await Promise.all([loadPlatformSummary(), loadCinemas()]);

	return (
		<Shell user={user}>
			<PageHeader
				title="Кинотеатры"
				description="Клиенты платформы: профиль, залы, сотрудники и подписка"
				actions={
					<NewClientAction
						title="Новый кинотеатр"
						description="Добавьте новый кинотеатр на платформу."
					/>
				}
			/>
			<PlatformMetrics state={summary} />
			{cinemas.status === "ready" ? (
				<CinemaDirectory rows={cinemas.data} />
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
