"use client";

import { Clapperboard } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ListPager } from "../../components/platform/list-pager";
import { cx, ui } from "../../lib/ui";
import { RescheduleSession } from "./reschedule-session";

export type SessionRow = {
	id: string;
	startsAt: string;
	status: string;
	basePriceUzs: number;
	soldSeats: number;
	movie: {
		title: string;
		durationMin: number;
		ageRating: string | null;
		posterUrl: string | null;
	};
	hall: { name: string; capacity: number };
	_count: { sessionSeats: number };
};

const FILTERS = [
	{ id: "ALL", label: "Все" },
	{ id: "PUBLISHED", label: "Опубликован" },
	{ id: "DRAFT", label: "Черновик" },
	{ id: "CANCELLED", label: "Отменён" },
] as const;

const STATUS_LABEL: Record<string, string> = {
	PUBLISHED: "Опубликован",
	DRAFT: "Черновик",
	CANCELLED: "Отменён",
};

const PAGE_SIZE = 8;

function tashkentStartOfToday() {
	const shifted = new Date(Date.now() + 5 * 60 * 60 * 1000);
	return new Date(
		Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
			5 * 60 * 60 * 1000,
	);
}

function statusClass(status: string) {
	if (status === "PUBLISHED") return ui.badgeOk;
	if (status === "DRAFT") return ui.badgeWarn;
	if (status === "CANCELLED") return ui.badgeBad;
	return ui.badgeMuted;
}

export function SessionsBoard({
	sessions,
	canManage,
}: {
	sessions: SessionRow[];
	canManage: boolean;
}) {
	const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const today = tashkentStartOfToday();

	const filtered = useMemo(() => {
		const text = query.trim().toLowerCase();
		return sessions.filter((session) => {
			const upcoming = new Date(session.startsAt) >= today;
			if (filter === "CANCELLED") {
				if (session.status !== "CANCELLED") return false;
			} else if (!upcoming || (filter !== "ALL" && session.status !== filter)) {
				return false;
			}
			if (!text) return true;
			return (
				session.movie.title.toLowerCase().includes(text) ||
				session.hall.name.toLowerCase().includes(text)
			);
		});
	}, [sessions, filter, query, today]);

	const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pages);
	const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
	const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;

	return (
		<>
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-2">
					{FILTERS.map((item) => (
						<button
							key={item.id}
							type="button"
							className={cx(ui.chip, filter === item.id && ui.chipOn)}
							onClick={() => {
								setFilter(item.id);
								setPage(1);
							}}
						>
							{item.label}
						</button>
					))}
				</div>
				<input
					className="h-10 w-full max-w-[260px] rounded-lg border border-line bg-white px-3 text-[13px] text-[#19253d] outline-none placeholder:text-[#8a97ad]"
					placeholder="Поиск по названию или залу..."
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
			</div>
			<div className="overflow-hidden rounded-xl border border-line bg-white text-[#19253d]">
				{slice.length === 0 ? (
					<p className="px-5 py-10 text-center text-sm text-[#78859c]">Сеансов нет</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead>
								<tr className="border-b border-line bg-[#fbfcfe] text-[11px] text-[#8a97ad]">
									<th className="px-5 py-3 font-medium">Фильм</th>
									<th className="px-5 py-3 font-medium">Время</th>
									<th className="px-5 py-3 font-medium">Зал</th>
									<th className="px-5 py-3 font-medium">Заполненность</th>
									<th className="px-5 py-3 font-medium">Цена</th>
									<th className="px-5 py-3 font-medium">Статус</th>
									{canManage ? <th className="px-5 py-3 font-medium" /> : null}
								</tr>
							</thead>
							<tbody>
								{slice.map((session) => {
									const when = new Date(session.startsAt);
									const capacity =
										session._count.sessionSeats > 0
											? session._count.sessionSeats
											: session.hall.capacity;
									const width =
										capacity > 0 ? Math.min(100, (session.soldSeats / capacity) * 100) : 0;
									return (
										<tr key={session.id} className="border-b border-[#f0f2f6] last:border-0">
											<td className="px-5 py-4">
												<div className="flex items-center gap-3">
													{session.movie.posterUrl ? (
														<Image
															src={session.movie.posterUrl}
															alt=""
															width={34}
															height={48}
															unoptimized
															className="h-12 w-[34px] rounded object-cover"
														/>
													) : (
														<div className="grid h-12 w-[34px] place-items-center rounded bg-[#eef2fa] text-[#8a97ad]">
															<Clapperboard className="size-4" />
														</div>
													)}
													<div>
														<strong className="block text-[13px]">{session.movie.title}</strong>
														<small className="text-[11px] text-[#8a96aa]">
															{session.movie.durationMin} мин
															{session.movie.ageRating ? ` · ${session.movie.ageRating}` : ""}
														</small>
													</div>
												</div>
											</td>
											<td className="px-5 py-4">
												<strong className="block text-[13px]">
													{when.toLocaleTimeString("ru-RU", {
														hour: "2-digit",
														minute: "2-digit",
														timeZone: "Asia/Tashkent",
													})}
												</strong>
												<small className="text-[11px] text-[#8a96aa]">
													{when.toLocaleDateString("ru-RU", {
														day: "numeric",
														month: "short",
														timeZone: "Asia/Tashkent",
													})}
												</small>
											</td>
											<td className="px-5 py-4 text-[13px] text-[#5a6882]">{session.hall.name}</td>
											<td className="px-5 py-4 text-[13px] text-[#5a6882]">
												{session.soldSeats} / {capacity}
												<div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-[#edf1fa]">
													<div
														className="h-full bg-[var(--primary)]"
														style={{ width: `${width}%` }}
													/>
												</div>
											</td>
											<td className="px-5 py-4 text-[13px]">
												{session.basePriceUzs.toLocaleString("ru-RU")} сум
											</td>
											<td className="px-5 py-4">
												<span className={cx(ui.badge, statusClass(session.status))}>
													{STATUS_LABEL[session.status] ?? session.status}
												</span>
											</td>
											{canManage ? (
												<td className="px-5 py-4 text-right">
													<RescheduleSession id={session.id} />
												</td>
											) : null}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
				<div className="border-t border-[#edf0f6] px-5">
					<ListPager
						page={safePage}
						pages={pages}
						from={from}
						to={Math.min(safePage * PAGE_SIZE, filtered.length)}
						total={filtered.length}
						onPage={setPage}
					/>
				</div>
			</div>
		</>
	);
}
