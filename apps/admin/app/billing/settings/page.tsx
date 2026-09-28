import { Card, CardHeader, EmptyState, PageHeader } from "@cinema/ui";
import { redirect } from "next/navigation";
import { Shell } from "../../../components/shell";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { SettingsForm } from "./settings-form";

type Settings = {
	defaultCommissionUzs: number;
	lockAfterDays: number;
	notifyHourTashkent: number;
	notifyTelegram: boolean;
	notifyApp: boolean;
	lateMessageTemplate: string;
};

export default async function BillingSettingsPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");

	let settings: Settings | null = null;
	try {
		settings = await serverApi<Settings>("/admin/billing/settings");
	} catch {
		settings = null;
	}

	return (
		<Shell user={user}>
			<PageHeader
				title="Комиссия и уведомления"
				description="Комиссия с билета, порог автоблокировки и ежедневные напоминания"
			/>
			{settings ? (
				<Card>
					<CardHeader title="Настройки платформы" />
					<SettingsForm initial={settings} />
				</Card>
			) : (
				<Card>
					<EmptyState
						title="Не удалось загрузить настройки"
						description="Повторите попытку позже."
					/>
				</Card>
			)}
		</Shell>
	);
}
