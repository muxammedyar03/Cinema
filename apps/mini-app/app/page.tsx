import { AfishaBoard } from "../components/afisha-board";
import { catalogRange } from "../lib/afisha";
import { publicApi } from "../lib/api";
import type { CatalogResponse, PublicCinema } from "../lib/types";

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ cinemaId?: string }>;
}) {
	const { cinemaId } = await searchParams;
	const range = catalogRange();
	const qs = new URLSearchParams({ from: range.from, to: range.to });
	if (cinemaId) qs.set("cinemaId", cinemaId);
	const [cinemas, catalog] = await Promise.all([
		publicApi<PublicCinema[]>("/public/cinemas"),
		publicApi<CatalogResponse>(`/public/catalog?${qs.toString()}`),
	]);

	return <AfishaBoard cinemas={cinemas} catalog={catalog} activeCinemaId={cinemaId} />;
}
