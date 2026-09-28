import { Card, EmptyState } from "@cinema/ui";
import { redirect } from "next/navigation";
import { CinemaDossierView } from "../../../components/platform/cinema-dossier";
import { Shell } from "../../../components/shell";
import { loadCinemaDossier } from "../../../lib/platform/load";
import { roleOf } from "../../../lib/rbac";
import { getMe } from "../../../lib/server-api";

/** Super admin sees the cinema card. Cinema staff still land on halls. */
export default async function CinemaDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const user = await getMe();
	if (!user) redirect("/login");
	const { id } = await params;
	if (roleOf(user) !== "super") redirect("/halls");

	const result = await loadCinemaDossier(id);
	return (
		<Shell user={user}>
			{result.status === "ready" ? (
				<CinemaDossierView dossier={result.data.dossier} profile={result.data.profile} />
			) : (
				<Card>
					<EmptyState
						title="Не удалось открыть кинотеатр"
						description={
							result.status === "error" ? result.message : "Карточка временно недоступна."
						}
					/>
				</Card>
			)}
		</Shell>
	);
}
