import { redirect } from "next/navigation";
import { roleOf } from "../../../../lib/rbac";
import { getMe, serverApi } from "../../../../lib/server-api";
import { EditClientForm } from "./edit-client-form";

type Dossier = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	description: string | null;
	timezone: string;
	billing: {
		monthlyPlanUzs: number;
		commissionPerTicketUzs: number;
		commissionIsOverride: boolean;
	};
};

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");
	const { id } = await params;
	const client = await serverApi<Dossier>(`/admin/cinemas/${id}/dossier`);
	return <EditClientForm user={user} initial={client} />;
}
