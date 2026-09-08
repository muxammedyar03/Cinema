import { redirect } from "next/navigation";
import { getMe, serverApi } from "../../../../lib/server-api";
import { EditMovieClient } from "./edit-client";

type Movie = {
	id: string;
	title: string;
	description: string | null;
	posterUrl: string | null;
	durationMin: number;
	rating: number | null;
	ageRating: string | null;
	genres: string[];
	audioLanguages: string[];
	releasedAt: string | null;
	status: "ACTIVE" | "ARCHIVED";
};

export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
	const user = await getMe();
	if (!user) redirect("/login");
	const canManage =
		user.role === "SUPER_ADMIN" || user.staff.some((s) => s.role === "CINEMA_ADMIN");
	if (!canManage) redirect("/movies");

	const { id } = await params;
	const movie = await serverApi<Movie>(`/admin/movies/${id}`);

	return <EditMovieClient movie={movie} />;
}
