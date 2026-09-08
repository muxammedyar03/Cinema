"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "../../../lib/api";
import { ui } from "../../../lib/ui";
import { MovieForm } from "../movie-form";

export default function NewMoviePage() {
	const router = useRouter();

	return (
		<>
			<h1>Новый фильм</h1>
			<p className={ui.sub}>Постер, жанры, озвучка, IMDb и дата выхода</p>
			<MovieForm
				submitLabel="Создать"
				onSubmit={async (payload) => {
					await clientApi("/admin/movies", {
						method: "POST",
						body: JSON.stringify(payload),
					});
					router.push("/movies");
					router.refresh();
				}}
			/>
		</>
	);
}
