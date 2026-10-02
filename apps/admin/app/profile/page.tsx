import type { CinemaAdminProfile } from "@cinema/types";
import { redirect } from "next/navigation";
import { CinemaProfileScreen } from "../../components/cinema-profile-screen";
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
			<CinemaProfileScreen cinemaId={cinemaId} initial={profile} />
		</Shell>
	);
}
