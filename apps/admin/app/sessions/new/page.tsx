"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientApi } from "../../../lib/api";
import { cx, ui } from "../../../lib/ui";

type Movie = { id: string; title: string };
type Cinema = { id: string; name: string };
type Hall = { id: string; name: string };

function todayDateValue() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function defaultTimeValue() {
	const d = new Date();
	d.setMinutes(0, 0, 0);
	d.setHours(d.getHours() + 1);
	return `${String(d.getHours()).padStart(2, "0")}:00`;
}

export default function NewSessionPage() {
	const router = useRouter();
	const [movies, setMovies] = useState<Movie[]>([]);
	const [cinemas, setCinemas] = useState<Cinema[]>([]);
	const [halls, setHalls] = useState<Hall[]>([]);
	const [movieId, setMovieId] = useState("");
	const [cinemaId, setCinemaId] = useState("");
	const [hallId, setHallId] = useState("");
	const [date, setDate] = useState(todayDateValue);
	const [time, setTime] = useState(defaultTimeValue);
	const [basePriceUzs, setBasePriceUzs] = useState(45000);
	const [vipPriceUzs, setVipPriceUzs] = useState(65000);
	const [generalAdmission, setGeneralAdmission] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		void clientApi<Movie[]>("/admin/movies").then((rows) => {
			setMovies(rows);
			if (rows[0]) setMovieId(rows[0].id);
		});
		void clientApi<Cinema[]>("/admin/cinemas").then((rows) => {
			setCinemas(rows);
			if (rows[0]) setCinemaId(rows[0].id);
		});
	}, []);

	useEffect(() => {
		if (!cinemaId) return;
		void clientApi<{ halls: Hall[] }>(`/admin/cinemas/${cinemaId}`).then((cinema) => {
			setHalls(cinema.halls);
			setHallId(cinema.halls[0]?.id ?? "");
		});
	}, [cinemaId]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		try {
			await clientApi("/admin/sessions", {
				method: "POST",
				body: JSON.stringify({
					movieId,
					cinemaId,
					hallId,
					startsAt: new Date(`${date}T${time}`).toISOString(),
					basePriceUzs: Number(basePriceUzs),
					...(generalAdmission ? { generalAdmission: true } : { vipPriceUzs: Number(vipPriceUzs) }),
				}),
			});
			router.push("/sessions");
			router.refresh();
		} catch {
			setError(
				generalAdmission
					? "Не удалось создать GA-сеанс."
					: "Не удалось создать сеанс. В зале нужны места в активном layout.",
			);
		}
	}

	return (
		<>
			<h1>Новый сеанс</h1>
			<p className={ui.sub}>DRAFT + снимок SessionSeat. Затем опубликуйте.</p>
			<form className={cx(ui.card, "max-w-[520px] p-[18px]")} onSubmit={onSubmit}>
				{error ? <p className={ui.err}>{error}</p> : null}
				<div className={ui.field}>
					<label className={ui.label} htmlFor="movie">
						Фильм
					</label>
					<select
						id="movie"
						className={ui.input}
						value={movieId}
						onChange={(e) => setMovieId(e.target.value)}
						required
					>
						{movies.map((m) => (
							<option key={m.id} value={m.id}>
								{m.title}
							</option>
						))}
					</select>
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="cinema">
						Кинотеатр
					</label>
					<select
						id="cinema"
						className={ui.input}
						value={cinemaId}
						onChange={(e) => setCinemaId(e.target.value)}
						required
					>
						{cinemas.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="hall">
						Зал
					</label>
					<select
						id="hall"
						className={ui.input}
						value={hallId}
						onChange={(e) => setHallId(e.target.value)}
						required
					>
						{halls.map((h) => (
							<option key={h.id} value={h.id}>
								{h.name}
							</option>
						))}
					</select>
				</div>
				<div className="mb-3.5 grid grid-cols-2 gap-3">
					<div className={ui.field}>
						<label className={ui.label} htmlFor="date">
							Дата
						</label>
						<input
							id="date"
							className={ui.input}
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
						/>
					</div>
					<div className={ui.field}>
						<label className={ui.label} htmlFor="time">
							Время
						</label>
						<input
							id="time"
							className={ui.input}
							type="text"
							inputMode="numeric"
							placeholder="Время"
							pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
							title="Формат HH:MM"
							maxLength={5}
							value={time}
							onChange={(e) => {
								const raw = e.target.value.replace(/[^\d:]/g, "").slice(0, 5);
								let next = raw;
								if (raw.length === 2 && !raw.includes(":") && time.length < 2) {
									next = `${raw}:`;
								} else if (raw.length === 3 && /^\d{3}$/.test(raw)) {
									next = `${raw.slice(0, 2)}:${raw.slice(2)}`;
								}
								setTime(next);
							}}
							required
						/>
					</div>
				</div>
				<div className={ui.field}>
					<label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-elev px-3 py-3">
						<input
							type="checkbox"
							className="mt-1"
							checked={generalAdmission}
							onChange={(e) => setGeneralAdmission(e.target.checked)}
						/>
						<span>
							<span className="block text-sm font-semibold text-ink">
								General admission (без мест)
							</span>
							<span className="mt-0.5 block text-[12px] text-muted">
								Карта мест не нужна — продажа по количеству до вместимости зала
							</span>
						</span>
					</label>
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="price">
						Цена {generalAdmission ? "билета" : "STANDARD"} (сум)
					</label>
					<input
						id="price"
						className={ui.input}
						type="number"
						min={1}
						value={basePriceUzs}
						onChange={(e) => setBasePriceUzs(Number(e.target.value))}
						required
					/>
				</div>
				{!generalAdmission ? (
					<div className={ui.field}>
						<label className={ui.label} htmlFor="vip">
							Цена VIP (сум)
						</label>
						<input
							id="vip"
							className={ui.input}
							type="number"
							min={1}
							value={vipPriceUzs}
							onChange={(e) => setVipPriceUzs(Number(e.target.value))}
						/>
					</div>
				) : null}
				<button className={cx(ui.btn, ui.btnPri)} type="submit">
					Создать
				</button>
			</form>
		</>
	);
}
