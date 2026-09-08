"use client";

import { useRouter } from "next/navigation";
import type { PublicCinema } from "../lib/types";
import { cx, ui } from "../lib/ui";

export function CinemaChips({ cinemas, activeId }: { cinemas: PublicCinema[]; activeId?: string }) {
	const router = useRouter();

	function select(id?: string) {
		const q = id ? `?cinemaId=${id}` : "/";
		router.push(q);
	}

	return (
		<div className={ui.filters}>
			<button
				type="button"
				className={cx(ui.chip, !activeId && ui.chipOn)}
				onClick={() => select()}
			>
				Все
			</button>
			{cinemas.map((c) => (
				<button
					key={c.id}
					type="button"
					className={cx(ui.chip, activeId === c.id && ui.chipOn)}
					onClick={() => select(c.id)}
				>
					{c.name}
				</button>
			))}
		</div>
	);
}
