"use client";

import { Chip } from "@cinema/ui";
import { useRouter } from "next/navigation";
import type { PublicCinema } from "../lib/types";

export function CinemaChips({ cinemas, activeId }: { cinemas: PublicCinema[]; activeId?: string }) {
	const router = useRouter();
	if (cinemas.length === 0) return null;

	function select(id?: string) {
		router.push(id ? `/?cinemaId=${encodeURIComponent(id)}` : "/");
	}

	return (
		<fieldset className="genres">
			<legend className="sr-only">Кинотеатр</legend>
			<Chip active={!activeId} onClick={() => select()}>
				Все
			</Chip>
			{cinemas.map((cinema) => (
				<Chip key={cinema.id} active={activeId === cinema.id} onClick={() => select(cinema.id)}>
					{cinema.name}
				</Chip>
			))}
		</fieldset>
	);
}
