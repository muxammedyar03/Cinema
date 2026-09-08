import { redirect } from "next/navigation";
import { roleOf } from "../../../lib/rbac";
import { getMe } from "../../../lib/server-api";

/** Super → client dossier; cinema admin → halls */
export default async function CinemaDetailRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await getMe();
	if (!user) redirect("/login");
	const { id } = await params;
	if (roleOf(user) === "super") {
		redirect(`/clients/${id}`);
	}
	redirect("/halls");
}
