"use client";

import { Chip } from "@cinema/ui";
import { useRouter } from "next/navigation";
import styles from "./platform.module.css";

const OPTIONS = [
	{ value: "ALL", label: "Все" },
	{ value: "DUE", label: "Ожидает оплаты" },
	{ value: "OVERDUE", label: "Просрочен" },
	{ value: "PAID", label: "Оплачен" },
	{ value: "VOID", label: "Аннулирован" },
] as const;

export function InvoiceStatusFilter({ status, cinemaId }: { status: string; cinemaId?: string }) {
	const router = useRouter();
	const current = status || "ALL";
	return (
		<fieldset className={styles.filters} aria-label="Статус счёта">
			{OPTIONS.map((option) => (
				<Chip
					key={option.value}
					active={current === option.value}
					onClick={() => {
						const query = new URLSearchParams();
						if (option.value !== "ALL") query.set("status", option.value);
						if (cinemaId) query.set("cinemaId", cinemaId);
						const text = query.toString();
						router.push(text ? `/billing/invoices?${text}` : "/billing/invoices");
					}}
				>
					{option.label}
				</Chip>
			))}
		</fieldset>
	);
}
