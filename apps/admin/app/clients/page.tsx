import { Card, EmptyState, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { AdminsTable } from "../../components/platform/admins-table";
import { ButtonLink } from "../../components/platform/button-link";
import styles from "../../components/platform/platform.module.css";
import { Shell } from "../../components/shell";
import { loadPlatformAdmins } from "../../lib/platform/load";
import { roleOf } from "../../lib/rbac";
import { getMe } from "../../lib/server-api";

export default async function ClientsPage({
	searchParams,
}: {
	searchParams: Promise<{ cursor?: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/halls");

	const { cursor } = await searchParams;
	const admins = await loadPlatformAdmins(cursor);

	return (
		<Shell user={user}>
			<PageHeader
				title="Администраторы"
				description="Пользователи кинотеатров и их роли"
				actions={
					<>
						<ButtonLink href="/cinemas" variant="secondary">
							Кинотеатры
						</ButtonLink>
						<ButtonLink href="/clients/new">Кинотеатр</ButtonLink>
					</>
				}
			/>
			{admins.status === "ready" ? (
				<>
					<AdminsTable rows={admins.data.items} />
					{admins.data.nextCursor ? (
						<div className={styles.more}>
							<ButtonLink
								href={`/clients?cursor=${encodeURIComponent(admins.data.nextCursor)}`}
								variant="secondary"
							>
								Дальше
							</ButtonLink>
						</div>
					) : null}
				</>
			) : (
				<Card>
					<EmptyState
						title={
							admins.status === "unavailable"
								? "Список администраторов недоступен"
								: "Не удалось загрузить администраторов"
						}
						description={
							admins.status === "unavailable"
								? "Команда появится после подключения списка администраторов. Пока здесь пусто — без примерных имён и чисел. Карточки кинотеатров по-прежнему открываются в разделе «Кинотеатры»."
								: admins.message
						}
						action={<ButtonLink href="/cinemas">К кинотеатрам</ButtonLink>}
					/>
				</Card>
			)}
		</Shell>
	);
}
