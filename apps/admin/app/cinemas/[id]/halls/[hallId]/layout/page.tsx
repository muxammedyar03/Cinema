import { redirect } from "next/navigation";
import { Shell } from "../../../../../../components/shell";
import { roleOf } from "../../../../../../lib/rbac";
import { getMe, serverApi } from "../../../../../../lib/server-api";
import { LayoutEditor } from "./layout-editor";

type Hall = {
	id: string;
	name: string;
	capacity: number;
	cinemaId: string;
};

type LayoutSeat = {
	id: string;
	rowLabel: string;
	number: number;
	type: "STANDARD" | "VIP" | "BLOCKED";
	x: number;
	y: number;
	rotation: number;
};

type Layout = {
	id: string | null;
	version: number;
	canvasWidth: number;
	canvasHeight: number;
	seats: LayoutSeat[];
};

export default async function HallLayoutPage({
	params,
}: {
	params: Promise<{ id: string; hallId: string }>;
}) {
	const user = await getMe();
	if (!user) {
		redirect("/login");
	}
	const { id: cinemaId, hallId } = await params;
	const canManage =
		user.role === "SUPER_ADMIN" ||
		user.staff.some((s) => s.cinemaId === cinemaId && s.role === "CINEMA_ADMIN");
	const role = roleOf(user);
	const hallsHome = role === "cinema" ? "/halls" : `/cinemas/${cinemaId}`;
	if (!canManage) {
		redirect(hallsHome);
	}

	const [hall, layout] = await Promise.all([
		serverApi<Hall>(`/admin/cinemas/${cinemaId}/halls/${hallId}`),
		serverApi<Layout>(`/admin/cinemas/${cinemaId}/halls/${hallId}/layout`),
	]);

	return (
		<Shell user={user}>
			<LayoutEditor cinemaId={cinemaId} hall={hall} initialLayout={layout} />
		</Shell>
	);
}
