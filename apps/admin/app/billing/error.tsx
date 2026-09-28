"use client";

import { Button, EmptyState } from "@cinema/ui";

export default function BillingError({ reset }: { error: Error; reset: () => void }) {
	return (
		<EmptyState
			title="Не удалось загрузить страницу"
			description="Повторите попытку. Если ошибка останется, обновите страницу."
			action={<Button onClick={() => reset()}>Повторить</Button>}
		/>
	);
}
