"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

export type MovieFormValues = {
	title: string;
	description: string;
	durationMin: number;
	ageRating: string;
	rating: string;
	genresText: string;
	releasedAt: string;
	audioLanguages: Array<"ru" | "uz" | "en">;
	posterUrl: string | null;
};

export const emptyMovieForm = (): MovieFormValues => ({
	title: "",
	description: "",
	durationMin: 120,
	ageRating: "12+",
	rating: "",
	genresText: "",
	releasedAt: "",
	audioLanguages: ["ru"],
	posterUrl: null,
});

const AUDIO_OPTIONS: Array<{ id: "ru" | "uz" | "en"; label: string }> = [
	{ id: "ru", label: "Русский" },
	{ id: "uz", label: "Oʻzbek" },
	{ id: "en", label: "English" },
];

const GENRE_SUGGESTIONS = [
	"Боевик",
	"Комедия",
	"Драма",
	"Ужасы",
	"Фантастика",
	"Триллер",
	"Мультфильм",
	"Приключения",
	"Семейный",
	"Романтика",
];

function parseGenres(text: string) {
	return text
		.split(",")
		.map((g) => g.trim())
		.filter(Boolean)
		.slice(0, 12);
}

function parseRating(raw: string): number | null {
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	const rating = Number(trimmed);
	if (Number.isNaN(rating) || rating < 0 || rating > 10) {
		throw new Error("rating");
	}
	return rating;
}

async function resolvePosterUrl(
	posterFile: File | null,
	current: string | null,
): Promise<string | undefined> {
	if (!posterFile) return current ?? undefined;
	const form = new FormData();
	form.append("file", posterFile);
	const uploaded = await clientApi<{ url: string }>("/admin/movies/upload-poster", {
		method: "POST",
		body: form,
	});
	return uploaded.url;
}

export function MovieForm({
	initial,
	submitLabel,
	onSubmit,
}: {
	initial?: Partial<MovieFormValues>;
	submitLabel: string;
	onSubmit: (payload: {
		title: string;
		description?: string;
		durationMin: number;
		ageRating?: string;
		rating?: number | null;
		genres: string[];
		audioLanguages: Array<"ru" | "uz" | "en">;
		releasedAt?: string | null;
		posterUrl?: string;
	}) => Promise<void>;
}) {
	const [values, setValues] = useState<MovieFormValues>({ ...emptyMovieForm(), ...initial });
	const [posterFile, setPosterFile] = useState<File | null>(null);
	const [posterPreview, setPosterPreview] = useState<string | null>(initial?.posterUrl ?? null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!posterFile) return;
		const url = URL.createObjectURL(posterFile);
		setPosterPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [posterFile]);

	function patch<K extends keyof MovieFormValues>(key: K, value: MovieFormValues[K]) {
		setValues((v) => ({ ...v, [key]: value }));
	}

	function toggleAudio(id: "ru" | "uz" | "en") {
		setValues((v) => {
			const has = v.audioLanguages.includes(id);
			return {
				...v,
				audioLanguages: has ? v.audioLanguages.filter((x) => x !== id) : [...v.audioLanguages, id],
			};
		});
	}

	function addGenre(genre: string) {
		const current = parseGenres(values.genresText);
		if (current.includes(genre)) {
			patch("genresText", current.filter((g) => g !== genre).join(", "));
			return;
		}
		patch("genresText", [...current, genre].join(", "));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setBusy(true);
		try {
			const posterUrl = await resolvePosterUrl(posterFile, values.posterUrl);
			const rating = parseRating(values.rating);
			await onSubmit({
				title: values.title,
				description: values.description.trim() || undefined,
				durationMin: Number(values.durationMin),
				ageRating: values.ageRating.trim() || undefined,
				rating,
				genres: parseGenres(values.genresText),
				audioLanguages: values.audioLanguages,
				releasedAt: values.releasedAt || null,
				posterUrl: posterUrl ?? values.posterUrl ?? "",
			});
		} catch {
			setError("Не удалось сохранить фильм. Проверьте поля.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<form className={cx(ui.card, "max-w-screen-md p-[18px]")} onSubmit={handleSubmit}>
			{error ? <p className={ui.err}>{error}</p> : null}
			<div className="grid grid-cols-5 gap-3">
				<div className={cx(ui.field, "col-span-2")}>
					<span className={ui.label}>Постер</span>
					{posterPreview ? (
						<div className="relative w-full overflow-hidden rounded-lg border border-line">
							<Image
								src={posterPreview}
								alt="Превью постера"
								width={400}
								height={600}
								unoptimized
								className="aspect-2/3 w-full object-cover"
							/>
							<button
								type="button"
								className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-md bg-black/55 text-white hover:bg-black/75"
								aria-label="Удалить постер"
								onClick={() => {
									setPosterFile(null);
									setPosterPreview(null);
									patch("posterUrl", null);
								}}
							>
								<X className="size-3.5" strokeWidth={2} />
							</button>
						</div>
					) : (
						<label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-elev px-4 py-8 text-center transition-colors hover:border-orange/50 hover:bg-orange/5">
							<ImagePlus className="size-7 text-muted" strokeWidth={1.6} />
							<span className="text-[13px] font-medium text-ink">Загрузить постер</span>
							<span className="text-[11px] text-faint">JPEG, PNG, WebP · до 5 МБ</span>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif"
								className="sr-only"
								onChange={(e) => {
									const file = e.target.files?.[0] ?? null;
									setPosterFile(file);
									e.target.value = "";
								}}
							/>
						</label>
					)}
				</div>

				<div className="col-span-3">
					<div className={ui.field}>
						<label className={ui.label} htmlFor="title">
							Название
						</label>
						<input
							id="title"
							className={ui.input}
							value={values.title}
							onChange={(e) => patch("title", e.target.value)}
							required
						/>
					</div>

					<div className={ui.field}>
						<label className={ui.label} htmlFor="description">
							Описание
						</label>
						<textarea
							id="description"
							className={cx(ui.input, "min-h-[110px] resize-y")}
							value={values.description}
							onChange={(e) => patch("description", e.target.value)}
							placeholder="Краткое описание фильма"
						/>
					</div>

					<div className={ui.field}>
						<span className={ui.label}>Озвучка / язык</span>
						<div className="flex flex-wrap gap-1.5">
							{AUDIO_OPTIONS.map((opt) => (
								<button
									key={opt.id}
									type="button"
									className={cx(ui.chip, values.audioLanguages.includes(opt.id) && ui.chipOn)}
									onClick={() => toggleAudio(opt.id)}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					<div className={ui.field}>
						<label className={ui.label} htmlFor="rating">
							IMDb рейтинг
						</label>
						<input
							id="rating"
							className={ui.input}
							type="float"
							min={0}
							max={10}
							step={0.1}
							value={values.rating}
							onChange={(e) => patch("rating", e.target.value)}
							placeholder="8.2"
						/>
					</div>

					<div className={ui.field}>
						<label className={ui.label} htmlFor="age">
							Возраст
						</label>
						<input
							id="age"
							className={ui.input}
							value={values.ageRating}
							onChange={(e) => patch("ageRating", e.target.value)}
							placeholder="12+"
						/>
					</div>
				</div>
			</div>

			<div className={ui.field}>
				<label className={ui.label} htmlFor="genres">
					Жанры
				</label>
				<input
					id="genres"
					className={ui.input}
					value={values.genresText}
					onChange={(e) => patch("genresText", e.target.value)}
					placeholder="Боевик, Драма"
				/>
				<p className={ui.hint}>Через запятую</p>
				<div className="mt-2 flex flex-wrap gap-1.5">
					{GENRE_SUGGESTIONS.map((g) => (
						<button
							key={g}
							type="button"
							className={cx(ui.chip, parseGenres(values.genresText).includes(g) && ui.chipOn)}
							onClick={() => addGenre(g)}
						>
							{g}
						</button>
					))}
				</div>
			</div>

			<div className="mb-3.5 grid grid-cols-2 gap-3">
				<div className={ui.field}>
					<label className={ui.label} htmlFor="dur">
						Длительность (мин)
					</label>
					<input
						id="dur"
						className={ui.input}
						type="number"
						min={1}
						value={values.durationMin}
						onChange={(e) => patch("durationMin", Number(e.target.value))}
						required
					/>
				</div>

				<div className={ui.field}>
					<label className={ui.label} htmlFor="releasedAt">
						Дата выхода
					</label>
					<input
						id="releasedAt"
						className={ui.input}
						type="date"
						value={values.releasedAt}
						onChange={(e) => patch("releasedAt", e.target.value)}
					/>
				</div>
			</div>

			<button className={cx(ui.btn, ui.btnPri)} type="submit" disabled={busy}>
				{busy ? "Сохранение…" : submitLabel}
			</button>
		</form>
	);
}
