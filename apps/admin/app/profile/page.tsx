import type { CinemaAdminProfile } from "@cinema/types";
import { redirect } from "next/navigation";
import { CinemaProfileWizard } from "../../components/cinema-profile-wizard";
import { Shell } from "../../components/shell";
import { primaryCinemaId, roleOf } from "../../lib/rbac";
import { getMe, serverApi } from "../../lib/server-api";

export default async function CinemaAdminProfilePage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/clients");
	const cinemaId = primaryCinemaId(user);
	if (!cinemaId) redirect("/login");
	const profile = await serverApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`);

	return (
		<Shell user={user}>
			<CinemaProfileWizard
				user={user}
				cinemaId={cinemaId}
				initial={profile}
				backHref="/halls"
				backLabel="К залам"
				doneHref="/halls"
			/>
		</Shell>
	);
}
