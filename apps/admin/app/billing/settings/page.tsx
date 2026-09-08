import { redirect } from "next/navigation";
import { Shell } from "../../../components/shell";
import { roleOf } from "../../../lib/rbac";
import { getMe, serverApi } from "../../../lib/server-api";
import { ui } from "../../../lib/ui";
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
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Комиссия и уведомления</h1>
					<p className={ui.sub}>
						Default комиссия с билета · порог авто-lock · ежедневные Telegram/App напоминания
					</p>
				</div>
			</div>
			<div className={ui.card}>
				<div className={ui.cardH}>Платформенные настройки</div>
				<div className="p-[18px]">
					<SettingsForm initial={settings} />
				</div>
			</div>
		</Shell>
	);
}
