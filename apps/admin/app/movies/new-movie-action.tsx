"use client";

import { Wizard, type WizardStep, WizardSummary } from "@cinema/ui";
import { ImagePlus, Pencil, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateAction, CreateBanner } from "../../components/create-action";
import fields from "../../components/platform/fields.module.css";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";
import { cx, ui } from "../../lib/ui";

type Audio = "ru" | "uz" | "en";

type Draft = {
	title: string;
	description: string;
	durationMin: string;
	ageRating: string;
	rating: string;
	genresText: string;
	releasedAt: string;
	audioLanguages: Audio[];
};

const AUDIO_OPTIONS: Array<{ id: Audio; label: string }> = [
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
	"Криминал",
	"Детектив",
	"Военный",
	"Вестерн",
	"Исторический",
	"Мистика",
	"Спорт",
	"Мюзикл",
	"Фэнтези",
];

const EMPTY: Draft = {
	title: "",
	description: "",
	durationMin: "120",
	ageRating: "12+",
	rating: "",
	genresText: "",
	releasedAt: "",
	audioLanguages: ["ru"],
};

function parseGenres(text: string) {
	return text
		.split(",")
		.map((genre) => genre.trim())
		.filter(Boolean)
		.slice(0, 12);
}

function toggleGenre(text: string, genre: string) {
	const current = parseGenres(text);
	if (current.includes(genre)) return current.filter((item) => item !== genre).join(", ");
	return [...current, genre].join(", ");
}

function MovieEditor({
	open,
	movieId,
	onClose,
}: {
	open: boolean;
	movieId?: string;
	onClose: () => void;
}) {
	const router = useRouter();
	const [draft, setDraft] = useState<Draft>(EMPTY);
	const [posterFile, setPosterFile] = useState<File | null>(null);
	const [posterPreview, setPosterPreview] = useState<string | null>(null);
	const [keptPoster, setKeptPoster] = useState<string | null>(null);

	useEffect(() => {
		if (!posterFile) return;
		const url = URL.createObjectURL(posterFile);
		setPosterPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [posterFile]);

	useEffect(() => {
		if (!open) return;
		if (!movieId) {
			setDraft(EMPTY);
			setPosterFile(null);
			setPosterPreview(null);
			setKeptPoster(null);
			return;
		}
		let alive = true;
		void clientApi<{
			title: string;
			description: string | null;
			durationMin: number;
			ageRating: string | null;
			rating: number | null;
			genres: string[];
			audioLanguages: string[];
			releasedAt: string | null;
			posterUrl: string | null;
		}>(`/admin/movies/${movieId}`).then((movie) => {
			if (!alive) return;
			const audio = movie.audioLanguages.filter(
				(item): item is Audio => item === "ru" || item === "uz" || item === "en",
			);
			setDraft({
				title: movie.title,
				description: movie.description ?? "",
				durationMin: String(movie.durationMin),
				ageRating: movie.ageRating ?? "",
				rating: movie.rating != null ? String(movie.rating) : "",
				genresText: movie.genres.join(", "),
				releasedAt: movie.releasedAt ? movie.releasedAt.slice(0, 10) : "",
				audioLanguages: audio.length > 0 ? audio : ["ru"],
			});
			setPosterFile(null);
			setPosterPreview(movie.posterUrl);
			setKeptPoster(movie.posterUrl);
		});
		return () => {
			alive = false;
		};
	}, [open, movieId]);

	function reset() {
		setDraft(EMPTY);
		setPosterFile(null);
		setPosterPreview(null);
		setKeptPoster(null);
	}

	const steps: WizardStep<Draft>[] = [
		{
			id: "card",
			title: "Фильм",
			subtitle: "Название, описание и длительность",
			validate: (data) => {
				if (!data.title.trim()) return "Укажите название";
				const duration = Number(data.durationMin);
				if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
					return "Длительность — целое число от 1 до 600 минут";
				}
				return null;
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Название</span>
						<input
							className={fields.input}
							value={data.title}
							onChange={(event) => update({ title: event.target.value })}
						/>
					</label>
					<label className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Описание</span>
						<textarea
							className={fields.textarea}
							value={data.description}
							placeholder="Краткое описание фильма"
							onChange={(event) => update({ description: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Длительность, мин</span>
						<input
							className={fields.input}
							inputMode="numeric"
							value={data.durationMin}
							onChange={(event) => update({ durationMin: event.target.value })}
						/>
					</label>
				</div>
			),
		},
		{
			id: "catalog",
			title: "Каталог",
			subtitle: "Жанр, озвучка, возраст и IMDb",
			validate: (data) => {
				if (data.rating.trim() === "") return null;
				const rating = Number(data.rating);
				if (Number.isNaN(rating) || rating < 0 || rating > 10) return "IMDb — число от 0 до 10";
				return null;
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Жанры</span>
						<input
							className={fields.input}
							value={data.genresText}
							placeholder="Боевик, Драма"
							onChange={(event) => update({ genresText: event.target.value })}
						/>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{GENRE_SUGGESTIONS.map((genre) => (
								<button
									key={genre}
									type="button"
									className={cx(ui.chip, parseGenres(data.genresText).includes(genre) && ui.chipOn)}
									onClick={() => update({ genresText: toggleGenre(data.genresText, genre) })}
								>
									{genre}
								</button>
							))}
						</div>
					</label>
					<div className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Озвучка</span>
						<div className="flex flex-wrap gap-1.5">
							{AUDIO_OPTIONS.map((option) => (
								<button
									key={option.id}
									type="button"
									className={cx(ui.chip, data.audioLanguages.includes(option.id) && ui.chipOn)}
									onClick={() =>
										update({
											audioLanguages: data.audioLanguages.includes(option.id)
												? data.audioLanguages.filter((item) => item !== option.id)
												: [...data.audioLanguages, option.id],
										})
									}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<label className={fields.field}>
						<span className={fields.label}>Возраст</span>
						<input
							className={fields.input}
							value={data.ageRating}
							placeholder="12+"
							onChange={(event) => update({ ageRating: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>IMDb</span>
						<input
							className={fields.input}
							inputMode="decimal"
							value={data.rating}
							placeholder="8.2"
							onChange={(event) => update({ rating: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Дата выхода</span>
						<input
							className={fields.input}
							type="date"
							value={data.releasedAt}
							onChange={(event) => update({ releasedAt: event.target.value })}
						/>
					</label>
				</div>
			),
		},
		{
			id: "poster",
			title: "Постер",
			subtitle: "JPEG, PNG или WebP, до 5 МБ",
			body: () => (
				<div className={fields.sectionGrid}>
					{posterPreview ? (
						<div className="relative w-40 overflow-hidden rounded-lg border border-line">
							<Image
								src={posterPreview}
								alt=""
								width={320}
								height={480}
								unoptimized
								className="aspect-2/3 w-full object-cover"
							/>
							<button
								type="button"
								className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/55 text-white"
								aria-label="Удалить постер"
								onClick={() => {
									setPosterFile(null);
									setPosterPreview(null);
									setKeptPoster(null);
								}}
							>
								<X className="size-3.5" />
							</button>
						</div>
					) : (
						<label className="grid h-40 w-full col-span-full cursor-pointer place-items-center rounded-lg border border-dashed border-line-strong text-muted">
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								className="hidden"
								onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)}
							/>
							<span className="flex flex-col items-center gap-1 text-[12px] font-semibold">
								<ImagePlus className="size-5" />
								Загрузить
							</span>
						</label>
					)}
				</div>
			),
		},
		{
			id: "review",
			title: "Проверка",
			subtitle: "Фильм появится в каталоге",
			body: (data) => (
				<WizardSummary
					rows={[
						{ label: "Название", value: data.title.trim() },
						{ label: "Длительность", value: `${data.durationMin} мин` },
						{ label: "Жанры", value: parseGenres(data.genresText).join(", ") },
						{ label: "Озвучка", value: data.audioLanguages.join(", ") },
						{ label: "IMDb", value: data.rating.trim() },
						{ label: "Выход", value: data.releasedAt },
						{
							label: "Постер",
							value: posterFile ? "будет загружен" : keptPoster ? "без изменений" : "нет",
						},
					]}
				/>
			),
		},
	];

	return (
		<Wizard
			open={open}
			title={movieId ? "Изменить фильм" : "Новый фильм"}
			subtitle="Каталог, жанр, озвучка и постер."
			steps={steps}
			data={draft}
			onChange={setDraft}
			onReset={reset}
			onClose={onClose}
			submitLabel={movieId ? "Сохранить" : "Создать"}
			onSubmit={async (data) => {
				try {
					let posterUrl = keptPoster ?? "";
					if (posterFile) {
						const form = new FormData();
						form.append("file", posterFile);
						const uploaded = await clientApi<{ url: string }>("/admin/movies/upload-poster", {
							method: "POST",
							body: form,
						});
						posterUrl = uploaded.url;
					}
					const rating = data.rating.trim() === "" ? null : Number(data.rating);
					const payload = {
						title: data.title.trim(),
						description: data.description.trim() || undefined,
						durationMin: Number(data.durationMin),
						ageRating: data.ageRating.trim() || undefined,
						rating,
						genres: parseGenres(data.genresText),
						audioLanguages: data.audioLanguages,
						releasedAt: data.releasedAt || null,
						posterUrl,
					};
					await clientApi(movieId ? `/admin/movies/${movieId}` : "/admin/movies", {
						method: movieId ? "PATCH" : "POST",
						body: JSON.stringify(payload),
					});
				} catch (cause) {
					throw new Error(errorText(cause, "Не удалось сохранить фильм. Проверьте поля."));
				}
				onClose();
				router.refresh();
			}}
		/>
	);
}

export function NewMovieAction() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateBanner
				title="Новый фильм"
				description="Создайте новый фильм для вашего кинотеатра"
				action={<CreateAction label="Создать фильм" onClick={() => setOpen(true)} />}
			/>
			<MovieEditor open={open} onClose={() => setOpen(false)} />
		</>
	);
}

export function MovieEditDialog({ movieId, open, onClose }: { movieId: string; open: boolean; onClose: () => void }) {
	return <MovieEditor open={open} movieId={movieId} onClose={onClose} />;
}

export function EditMovieButton({ movieId }: { movieId: string }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				className={cx(ui.btn, ui.btnSm, ui.btnGhost)}
				type="button"
				onClick={() => setOpen(true)}
			>
				<Pencil className="size-3.5" strokeWidth={2} />
				Изменить
			</button>
			<MovieEditDialog movieId={movieId} open={open} onClose={() => setOpen(false)} />
		</>
	);
}
