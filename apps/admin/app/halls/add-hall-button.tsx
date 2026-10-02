"use client";

import { Wizard, type WizardStep, WizardSummary } from "@cinema/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateAction, CreateBanner } from "../../components/create-action";
import fields from "../../components/platform/fields.module.css";
import { clientApi } from "../../lib/api";
import { errorText } from "../../lib/api-error";

type Draft = { name: string; capacity: string };

const EMPTY: Draft = { name: "", capacity: "90" };

const STEPS: WizardStep<Draft>[] = [
	{
		id: "hall",
		title: "Зал",
		subtitle: "Название и вместимость",
		validate: (data) => {
			if (!data.name.trim()) return "Укажите название зала";
			const capacity = Number(data.capacity);
			if (!Number.isInteger(capacity) || capacity < 1)
				return "Вместимость — целое число больше нуля";
			return null;
		},
		body: (data, update) => (
			<div className={fields.sectionGrid}>
				<label className={fields.field}>
					<span className={fields.label}>Название</span>
					<input
						className={fields.input}
						value={data.name}
						placeholder="Зал 1"
						onChange={(event) => update({ name: event.target.value })}
					/>
				</label>
				<label className={fields.field}>
					<span className={fields.label}>Вместимость</span>
					<input
						className={fields.input}
						inputMode="numeric"
						value={data.capacity}
						onChange={(event) => update({ capacity: event.target.value })}
					/>
				</label>
			</div>
		),
	},
	{
		id: "review",
		title: "Проверка",
		subtitle: "После создания можно нарисовать схему мест",
		body: (data) => (
			<WizardSummary
				rows={[
					{ label: "Название", value: data.name.trim() },
					{ label: "Вместимость", value: data.capacity },
				]}
			/>
		),
	},
];

export function AddHallButton({ cinemaId }: { cinemaId: string }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(EMPTY);

	return (
		<>
			<CreateBanner
				title="Новый зал"
				description="Название и вместимость, затем схема мест"
				action={
					<CreateAction
						label="Новый зал"
						onClick={() => {
							setDraft(EMPTY);
							setOpen(true);
						}}
					/>
				}
			/>
			<Wizard
				open={open}
				title="Новый зал"
				subtitle="Добавьте зал шаг за шагом."
				steps={STEPS}
				data={draft}
				onChange={setDraft}
				onReset={() => setDraft(EMPTY)}
				onClose={() => setOpen(false)}
				submitLabel="Добавить зал"
				onSubmit={async (data) => {
					try {
						await clientApi(`/admin/cinemas/${cinemaId}/halls`, {
							method: "POST",
							body: JSON.stringify({ name: data.name.trim(), capacity: Number(data.capacity) }),
						});
					} catch (cause) {
						throw new Error(errorText(cause, "Не удалось создать зал"));
					}
					setOpen(false);
					router.refresh();
				}}
			/>
		</>
	);
}
