"use client";

import { Chip } from "@cinema/ui";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	collectGenres,
	minSessionPrice,
	moviesOnDay,
	pickFeatured,
	sixDayKeys,
} from "../lib/afisha";
import { filmsCountLabel, formatMinutes, formatMonthDay, formatPrice } from "../lib/format";
import type { CatalogResponse, PublicCinema } from "../lib/types";
import { CinemaChips } from "./cinema-chips";
import { DateStrip } from "./date-strip";
import { LinkButton } from "./link-button";
import { MovieCard } from "./movie-card";

export function AfishaBoard({
	cinemas,
	catalog,
	activeCinemaId,
}: {
	cinemas: PublicCinema[];
	catalog: CatalogResponse;
	activeCinemaId?: string;
}) {
	const days = useMemo(() => sixDayKeys(), []);
	const [day, setDay] = useState(() => {
		const withFilms = days.find((key) => moviesOnDay(catalog.days, key).length > 0);
		return withFilms ?? days[0] ?? "";
	});
	const [genre, setGenre] = useState("Все");

	const dayMovies = moviesOnDay(catalog.days, day);
	const featured = pickFeatured(dayMovies, {
		featuredMovieId: catalog.featuredMovieId,
		featuredSource: catalog.featuredSource,
	});
	const genres = collectGenres(dayMovies);
	const visible =
		genre === "Все" ? dayMovies : dayMovies.filter((movie) => movie.genres?.includes(genre));
	const activeCinema =
		cinemas.find((cinema) => cinema.id === activeCinemaId) ??
		(cinemas.length === 1 ? cinemas[0] : undefined);
	const place = [activeCinema?.name, activeCinema?.city].filter(Boolean).join(" · ");
	const price = featured ? minSessionPrice(featured.movie) : null;
	const genreLine = featured
		? [featured.movie.genres?.[0], formatMinutes(featured.movie.durationMin)]
				.filter(Boolean)
				.join(" · ")
		: "";

	return (
		<>
			<div className="pad">
				{place ? (
					<div className="location">
						<span aria-hidden="true">⌖</span>
						<span>{place}</span>
						{activeCinema ? <Link href={`/cinemas/${activeCinema.id}`}>О кинотеатре</Link> : null}
					</div>
				) : null}
				<h1 className="greeting">
					Сегодня — в кино.
					<small>Выберите историю для своего вечера.</small>
				</h1>
			</div>

			<CinemaChips cinemas={cinemas} activeId={activeCinemaId} />
			<DateStrip days={days} active={day} onSelect={setDay} />

			{featured ? (
				<Link href={`/movies/${featured.movie.id}`} className="featured">
					{featured.movie.posterUrl ? (
						<Image
							className="featured-img"
							src={featured.movie.posterUrl}
							alt={featured.movie.title}
							fill
							unoptimized
							sizes="480px"
						/>
					) : (
						<div className="featured-fallback" />
					)}
					<div className="featured-top">
						<span>В центре внимания</span>
						{featured.movie.ageRating ? <span>{featured.movie.ageRating}</span> : null}
					</div>
					<div className="featured-copy">
						{genreLine ? <small>{genreLine}</small> : null}
						<h2>{featured.movie.title}</h2>
						<div className="featured-bottom">
							<p>{price != null ? `от ${formatPrice(price)}` : ""}</p>
							<span className="v2-btn v2-btn-small">Выбрать сеанс</span>
						</div>
					</div>
				</Link>
			) : null}

			<div className="section-head">
				<h2>Афиша на {day ? formatMonthDay(day) : "сегодня"}</h2>
				<span>{filmsCountLabel(visible.length)}</span>
			</div>

			{genres.length > 0 ? (
				<fieldset className="genres">
					<legend className="sr-only">Жанр</legend>
					{["Все", ...genres].map((item) => (
						<Chip key={item} active={genre === item} onClick={() => setGenre(item)}>
							{item}
						</Chip>
					))}
				</fieldset>
			) : null}

			{visible.length === 0 ? (
				<p className="note">
					{dayMovies.length === 0
						? "На эту дату сеансов нет."
						: "В этом жанре на выбранную дату сеансов нет."}
				</p>
			) : (
				<div className="poster-grid">
					{visible.map((movie) => (
						<MovieCard key={movie.id} movie={movie} />
					))}
				</div>
			)}

			{!featured && dayMovies.length === 0 ? (
				<div className="stack">
					<LinkButton href="/orders" variant="secondary">
						Мои билеты
					</LinkButton>
				</div>
			) : null}
		</>
	);
}
