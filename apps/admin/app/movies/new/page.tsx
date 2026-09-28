"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { clientApi } from "../../../lib/api";
import {
	FEATURED_SAVE_ERROR,
	isOptionalFieldError,
	OptionalFieldError,
} from "../../../lib/featured-film";
import { PageHeader } from "../../../lib/ui-kit";
import { MovieForm } from "../movie-form";
import { saveFeatured } from "../save-featured";

export default function NewMoviePage() {
	const router = useRouter();
	const createdId = useRef<string | null>(null);

	return (
		<>
			<PageHeader title="Новый фильм" description="Постер, жанры, озвучка, рейтинг и дата выхода" />
			<MovieForm
				submitLabel="Создать"
				onSubmit={async (payload) => {
					if (createdId.current) {
						throw new OptionalFieldError(FEATURED_SAVE_ERROR);
					}
					const { isFeatured, ...rest } = payload;
					const created = await clientApi<{ id: string }>("/admin/movies", {
						method: "POST",
						body: JSON.stringify(rest),
					});
					createdId.current = created.id;
					if (isFeatured === true) {
						const movies =
							await clientApi<Array<{ id: string; isFeatured?: boolean | null }>>("/admin/movies");
						try {
							await saveFeatured(created.id, true, movies);
						} catch (err) {
							if (isOptionalFieldError(err)) {
								throw new OptionalFieldError(
									"Фильм создан, но «В центре внимания» не сохранился. Сервер пока не принимает это поле.",
								);
							}
							throw err;
						}
					}
					router.push("/movies");
					router.refresh();
				}}
			/>
		</>
	);
}
