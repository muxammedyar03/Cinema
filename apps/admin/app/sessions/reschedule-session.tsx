"use client";

import { Wizard, type WizardStep, WizardSummary } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import fields from "../../components/platform/fields.module.css";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";

type Hall = { id: string; name: string };
type Detail = {
	cinemaId: string;
	hallId: string;
	basePriceUzs: number;
	startsAt: string;
	pricing: Array<{ seatType: string; priceUzs: number }>;
	_count: { sessionSeats: number };
};

type Draft = {
	cinemaId: string;
	hallId: string;
	date: string;
	time: string;
	basePriceUzs: string;
	vipPriceUzs: string;
	generalAdmission: boolean;
};

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

function partsInTashkent(iso: string) {
	const date = new Date(iso);
	return {
		date: date.toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" }),
		time: date.toLocaleTimeString("en-GB", {
			timeZone: "Asia/Tashkent",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}),
	};
}

export function RescheduleSession({ id }: { id: string }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [halls, setHalls] = useState<Hall[]>([]);

	async function show() {
		const session = await clientApi<Detail>(`/admin/sessions/${id}`);
		const when = partsInTashkent(session.startsAt);
		const vip = session.pricing.find((row) => row.seatType === "VIP");
		const cinema = await clientApi<{ halls: Hall[] }>(`/admin/cinemas/${session.cinemaId}`);
		setHalls(cinema.halls);
		setDraft({
			cinemaId: session.cinemaId,
			hallId: session.hallId,
			date: when.date,
			time: when.time,
			basePriceUzs: String(session.basePriceUzs),
			vipPriceUzs: String(vip?.priceUzs ?? session.basePriceUzs),
			generalAdmission: session._count.sessionSeats === 0,
		});
		setOpen(true);
	}

	const steps: WizardStep<Draft>[] = [
		{
			id: "when",
			title: "Время",
			subtitle: "Новый день и начало",
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
							maxLength={5}
							value={data.time}
							onChange={(event) => update({ time: maskTime(event.target.value, data.time) })}
						/>
					</label>
				</div>
			),
		},
		{
			id: "hall",
			title: "Зал",
			subtitle: "Можно оставить текущий зал",
			validate: (data) => (data.hallId ? null : "Выберите зал"),
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={fields.field}>
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
			subtitle: "Сеанс будет опубликован заново",
			body: (data) => (
				<WizardSummary
					rows={[
						{ label: "Зал", value: halls.find((hall) => hall.id === data.hallId)?.name ?? "" },
						{ label: "Начало", value: `${data.date} ${data.time}` },
						{
							label: "Цена",
							value: data.generalAdmission
								? `${data.basePriceUzs} · общий вход`
								: `${data.basePriceUzs} / VIP ${data.vipPriceUzs}`,
						},
					]}
				/>
			),
		},
	];

	return (
		<>
			<button
				type="button"
				className="text-[12px] font-semibold text-[var(--primary)]"
				onClick={() => void show()}
			>
				Разместить
			</button>
			{draft ? (
				<Wizard
					open={open}
					title="Разместить сеанс"
					subtitle="День, время, зал и цена существующего сеанса."
					steps={steps}
					data={draft}
					onChange={setDraft}
					onClose={() => setOpen(false)}
					submitLabel="Опубликовать"
					onSubmit={async (data) => {
						try {
							await clientApi(`/admin/sessions/${id}`, {
								method: "PATCH",
								body: JSON.stringify({
									hallId: data.hallId,
									startsAt: new Date(`${data.date}T${data.time}`).toISOString(),
									basePriceUzs: Number(data.basePriceUzs),
									generalAdmission: data.generalAdmission,
									...(data.generalAdmission || !data.vipPriceUzs.trim()
										? {}
										: { vipPriceUzs: Number(data.vipPriceUzs) }),
								}),
							});
							await clientApi(`/admin/sessions/${id}/publish`, { method: "POST" });
						} catch (cause) {
							throw new Error(errorText(cause, "Не удалось разместить сеанс"));
						}
						setOpen(false);
						router.refresh();
					}}
				/>
			) : null}
		</>
	);
}
