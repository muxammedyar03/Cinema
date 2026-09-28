"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "../../../lib/api";
import { PageHeader } from "../../../lib/ui-kit";
import { MovieForm } from "../movie-form";

export default function NewMoviePage() {
	const router = useRouter();

	return (
		<>
			<PageHeader title="Новый фильм" description="Постер, жанры, озвучка, рейтинг и дата выхода" />
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
