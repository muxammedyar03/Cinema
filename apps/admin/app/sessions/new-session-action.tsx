"use client";

import { Button, Wizard, type WizardStep, WizardSummary } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateAction, CreateBanner } from "../../components/create-action";
import fields from "../../components/platform/fields.module.css";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";

type Movie = { id: string; title: string };
type Cinema = { id: string; name: string };
type Hall = { id: string; name: string };

type Draft = {
	movieId: string;
	cinemaId: string;
	hallId: string;
	date: string;
	time: string;
	basePriceUzs: string;
	vipPriceUzs: string;
	generalAdmission: boolean;
};

function todayDateValue() {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

function defaultTimeValue() {
	const now = new Date();
	now.setMinutes(0, 0, 0);
	now.setHours(now.getHours() + 1);
	return `${String(now.getHours()).padStart(2, "0")}:00`;
}

function emptyDraft(): Draft {
	return {
		movieId: "",
		cinemaId: "",
		hallId: "",
		date: todayDateValue(),
		time: defaultTimeValue(),
		basePriceUzs: "45000",
		vipPriceUzs: "65000",
		generalAdmission: false,
	};
}

function maskTime(rawValue: string, previous: string) {
	const raw = rawValue.replace(/[^\d:]/g, "").slice(0, 5);
	if (raw.length === 2 && !raw.includes(":") && previous.length < 2) return `${raw}:`;
	if (raw.length === 3 && /^\d{3}$/.test(raw)) return `${raw.slice(0, 2)}:${raw.slice(2)}`;
	return raw;
}

function priceOk(value: string) {
	const price = Number(value);
	return Number.isInteger(price) && price > 0;
}

export function NewSessionAction({
	variant = "banner",
	movieId,
}: {
	variant?: "banner" | "header" | "card";
	movieId?: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(emptyDraft);
	const [movies, setMovies] = useState<Movie[]>([]);
	const [cinemas, setCinemas] = useState<Cinema[]>([]);
	const [halls, setHalls] = useState<Hall[]>([]);

	async function loadHalls(cinemaId: string) {
		if (!cinemaId) {
			setHalls([]);
			return [];
		}
		const cinema = await clientApi<{ halls: Hall[] }>(`/admin/cinemas/${cinemaId}`);
		setHalls(cinema.halls);
		return cinema.halls;
	}

	async function show() {
		const next = { ...emptyDraft(), movieId: movieId ?? "" };
		setDraft(next);
		setOpen(true);
		try {
			const [movieRows, cinemaRows] = await Promise.all([
				clientApi<Movie[]>("/admin/movies"),
				clientApi<Cinema[]>("/admin/cinemas"),
			]);
			setMovies(movieRows);
			setCinemas(cinemaRows);
			const cinemaId = cinemaRows[0]?.id ?? "";
			const hallRows = await loadHalls(cinemaId);
			setDraft((current) => ({
				...current,
				movieId: movieId || current.movieId || movieRows[0]?.id || "",
				cinemaId: current.cinemaId || cinemaId,
				hallId: current.hallId || hallRows[0]?.id || "",
			}));
		} catch {
			setMovies([]);
			setCinemas([]);
			setHalls([]);
		}
	}

	const steps: WizardStep<Draft>[] = [
		{
			id: "place",
			title: "Новый сеанс",
			subtitle: "Фильм, кинотеатр и зал",
			validate: (data) => {
				if (!data.movieId) return "Выберите фильм";
				if (!data.cinemaId) return "Выберите кинотеатр";
				if (!data.hallId) return "Выберите зал";
				return null;
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={fields.field}>
						<span className={fields.label}>Фильм</span>
						<select
							className={fields.input}
							value={data.movieId}
							onChange={(event) => update({ movieId: event.target.value })}
						>
							{movies.map((movie) => (
								<option key={movie.id} value={movie.id}>
									{movie.title}
								</option>
							))}
						</select>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Кинотеатр</span>
						<select
							className={fields.input}
							value={data.cinemaId}
							onChange={(event) => {
								const cinemaId = event.target.value;
								setDraft((current) => ({ ...current, cinemaId, hallId: "" }));
								void loadHalls(cinemaId).then((rows) => {
									setDraft((current) =>
										current.cinemaId === cinemaId
											? { ...current, hallId: rows[0]?.id ?? "" }
											: current,
									);
								});
							}}
						>
							{cinemas.map((cinema) => (
								<option key={cinema.id} value={cinema.id}>
									{cinema.name}
								</option>
							))}
						</select>
					</label>
					<label className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Зал</span>
						<select
							className={fields.input}
							value={data.hallId}
							onChange={(event) => update({ hallId: event.target.value })}
						>
							{halls.map((hall) => (
								<option key={hall.id} value={hall.id}>
									{hall.name}
								</option>
							))}
						</select>
					</label>
				</div>
			),
		},
		{
			id: "when",
			title: "Время",
			subtitle: "Дата и начало сеанса",
			validate: (data) => {
				if (!data.date) return "Укажите дату";
				if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) return "Время в формате HH:MM";
				return null;
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={fields.field}>
						<span className={fields.label}>Дата</span>
						<input
							className={fields.input}
							type="date"
							value={data.date}
							onChange={(event) => update({ date: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Время</span>
						<input
							className={fields.input}
							inputMode="numeric"
							placeholder="18:00"
							maxLength={5}
							value={data.time}
							onChange={(event) => update({ time: maskTime(event.target.value, data.time) })}
						/>
					</label>
				</div>
			),
		},
		{
			id: "price",
			title: "Цена",
			subtitle: "STANDARD, VIP или общий вход",
			validate: (data) => {
				if (!priceOk(data.basePriceUzs)) return "Укажите цену целым числом больше нуля";
				if (!data.generalAdmission && data.vipPriceUzs.trim() && !priceOk(data.vipPriceUzs)) {
					return "VIP-цена — целое число больше нуля";
				}
				return null;
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={`${fields.check} ${fields.span2}`}>
						<input
							type="checkbox"
							checked={data.generalAdmission}
							onChange={(event) => update({ generalAdmission: event.target.checked })}
						/>
						General admission (без мест)
					</label>
					<label className={fields.field}>
						<span className={fields.label}>
							Цена {data.generalAdmission ? "билета" : "STANDARD"}, сум
						</span>
						<input
							className={fields.input}
							inputMode="numeric"
							value={data.basePriceUzs}
							onChange={(event) => update({ basePriceUzs: event.target.value })}
						/>
					</label>
					{data.generalAdmission ? null : (
						<label className={fields.field}>
							<span className={fields.label}>Цена VIP, сум</span>
							<input
								className={fields.input}
								inputMode="numeric"
								value={data.vipPriceUzs}
								onChange={(event) => update({ vipPriceUzs: event.target.value })}
							/>
						</label>
					)}
				</div>
			),
		},
		{
			id: "review",
			title: "Проверка",
			subtitle: "Сеанс создаётся как черновик",
			body: (data) => (
				<WizardSummary
					rows={[
						{
							label: "Фильм",
							value: movies.find((movie) => movie.id === data.movieId)?.title ?? "",
						},
						{
							label: "Кинотеатр",
							value: cinemas.find((cinema) => cinema.id === data.cinemaId)?.name ?? "",
						},
						{ label: "Зал", value: halls.find((hall) => hall.id === data.hallId)?.name ?? "" },
						{ label: "Начало", value: `${data.date} ${data.time}` },
						{
							label: "Цена",
							value: data.generalAdmission
								? `${data.basePriceUzs} · общий вход`
								: data.vipPriceUzs.trim()
									? `${data.basePriceUzs} / VIP ${data.vipPriceUzs}`
									: data.basePriceUzs,
						},
					]}
				/>
			),
		},
	];

	return (
		<>
			{variant === "header" ? (
				<Button onClick={() => void show()}>+ Создать сеанс</Button>
			) : variant === "card" ? (
				<Button variant="secondary" className="w-full" onClick={() => void show()}>
					Создать сеанс
				</Button>
			) : (
				<CreateBanner
					title="Новый сеанс"
					description="Создайте новый сеанс для вашего кинотеатра"
					action={<CreateAction label="Создать сеанс" onClick={() => void show()} />}
				/>
			)}
			<Wizard
				open={open}
				title="Новый сеанс"
				subtitle="Черновик сеанса, затем публикация."
				steps={steps}
				data={draft}
				onChange={setDraft}
				onReset={() => setDraft(emptyDraft())}
				onClose={() => setOpen(false)}
				submitLabel="Создать"
				onSubmit={async (data) => {
					try {
						await clientApi("/admin/sessions", {
							method: "POST",
							body: JSON.stringify({
								movieId: data.movieId,
								cinemaId: data.cinemaId,
								hallId: data.hallId,
								startsAt: new Date(`${data.date}T${data.time}`).toISOString(),
								basePriceUzs: Number(data.basePriceUzs),
								...(data.generalAdmission
									? { generalAdmission: true }
									: data.vipPriceUzs.trim()
										? { vipPriceUzs: Number(data.vipPriceUzs) }
										: {}),
							}),
						});
					} catch (cause) {
						throw new Error(
							errorText(
								cause,
								data.generalAdmission
									? "Не удалось создать GA-сеанс."
									: "Не удалось создать сеанс. В зале нужны места в активном layout.",
							),
						);
					}
					setOpen(false);
					router.refresh();
				}}
			/>
		</>
	);
}
