import type { CinemaAdminProfile } from "@cinema/types";
import { redirect } from "next/navigation";
import { CinemaProfileScreen } from "../../../../components/cinema-profile-screen";
import { Shell } from "../../../../components/shell";
import { roleOf } from "../../../../lib/rbac";
import { getMe, serverApi } from "../../../../lib/server-api";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/profile");
	const { id } = await params;
	const profile = await serverApi<CinemaAdminProfile>(`/admin/cinemas/${id}/profile`);

	return (
		<Shell user={user}>
			<CinemaProfileScreen cinemaId={id} initial={profile} />
		</Shell>
	);
}
