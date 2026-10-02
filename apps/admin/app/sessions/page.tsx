import { PageHeader } from "@cinema/ui";
import { getMe, serverApi } from "../../lib/server-api";
import { NewSessionAction } from "./new-session-action";
import { type SessionRow, SessionsBoard } from "./sessions-board";

export default async function SessionsPage() {
	const user = await getMe();
	if (!user) return null;
	const sessions = await serverApi<SessionRow[]>("/admin/sessions");
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((s) => s.role === "CINEMA_ADMIN");

	return (
		<>
			<PageHeader
				title="Сеансы"
				description="Планируйте показы и управляйте продажей билетов"
				actions={canManage ? <NewSessionAction /> : null}
			/>
			<SessionsBoard sessions={sessions} canManage={canManage} />
		</>
	);
}
