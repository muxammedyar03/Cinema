import { Clapperboard } from "lucide-react";
import Image from "next/image";
import { cx, ui } from "../../lib/ui";
import { MovieRowActions } from "./movie-actions";

export type MovieListItem = {
	id: string;
	title: string;
	durationMin: number;
	ageRating: string | null;
	posterUrl: string | null;
	rating: number | null;
	genres: string[];
	audioLanguages: string[];
	releasedAt: string | null;
	status: "ACTIVE" | "ARCHIVED";
};

const AUDIO_LABEL: Record<string, string> = {
	ru: "RU",
	uz: "UZ",
	en: "EN",
};

function formatRelease(value: string | null) {
	if (!value) return "—";
	return new Date(value).toLocaleDateString("ru-RU");
}

function audioLabel(codes: string[]) {
	if (codes.length === 0) return "—";
	return codes.map((a) => AUDIO_LABEL[a] ?? a).join(" · ");
}

export function MovieTableRow({ movie, canManage }: { movie: MovieListItem; canManage: boolean }) {
	return (
		<tr className={movie.status === "ARCHIVED" ? "opacity-60" : undefined}>
			<td>
				<div className="flex items-center gap-3">
					{movie.posterUrl ? (
						<Image
							src={movie.posterUrl}
							alt=""
							width={40}
							height={40}
							unoptimized
							className="size-10 shrink-0 rounded-md object-cover"
						/>
					) : (
						<div className="grid size-10 shrink-0 place-items-center rounded-md bg-elev text-faint">
							<Clapperboard className="size-4" strokeWidth={1.6} />
						</div>
					)}
					<div>
						<b>{movie.title}</b>
						<div className="text-[11px] text-faint">
							{movie.durationMin} мин
							{movie.ageRating ? ` · ${movie.ageRating}` : ""}
						</div>
					</div>
				</div>
			</td>
			<td className="text-[13px] text-muted">
				{movie.genres.length > 0 ? movie.genres.join(", ") : "—"}
			</td>
			<td className="text-[13px] text-muted">{audioLabel(movie.audioLanguages)}</td>
			<td>{movie.rating != null ? movie.rating.toFixed(1) : "—"}</td>
			<td>{formatRelease(movie.releasedAt)}</td>
			<td>
				<span className={cx(ui.badge, movie.status === "ACTIVE" ? ui.badgeOk : ui.badgeMuted)}>
					{movie.status === "ACTIVE" ? "Активен" : "Архив"}
				</span>
			</td>
			{canManage ? (
				<td className="text-right">
					<MovieRowActions movie={movie} />
				</td>
			) : null}
		</tr>
	);
}
