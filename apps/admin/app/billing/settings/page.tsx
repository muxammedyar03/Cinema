import { redirect } from "next/navigation";
import { Shell } from "../../../components/shell";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { Card, CardHeader, PageHeader } from "../../../lib/ui-kit";
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

	const settings = await serverApi<Settings>("/admin/billing/settings");

	return (
		<Shell user={user}>
			<PageHeader
				title="Комиссия и уведомления"
				description="Комиссия с билета, порог автоблокировки и ежедневные напоминания"
			/>
			<Card>
				<CardHeader title="Платформенные настройки" />
				<div className="p-[18px]">
					<SettingsForm initial={settings} />
				</div>
			</Card>
		</Shell>
	);
}
