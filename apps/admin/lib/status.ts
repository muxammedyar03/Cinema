import type { BadgeTone } from "@cinema/ui";

const LABELS: Record<string, string> = {
	PUBLISHED: "Опубликован",
	DRAFT: "Черновик",
	CANCELLED: "Отменён",
	PAID: "Оплачен",
	PENDING_PAYMENT: "Ожидает оплаты",
	REFUND_PENDING: "Возврат в процессе",
	REFUNDED: "Возвращён",
	EXPIRED: "Истёк",
	ACTIVE: "Активен",
	ARCHIVED: "Архив",
	USED: "Использован",
	LOCKED: "Заблокирован",
	DISABLED: "Отключён",
	DUE: "К оплате",
	OVERDUE: "Просрочен",
	PENDING: "Ожидает",
	VOID: "Аннулирован",
};

const TONES: Record<string, BadgeTone> = {
	PUBLISHED: "ok",
	PAID: "ok",
	ACTIVE: "ok",
	REFUNDED: "ok",
	DRAFT: "warn",
	PENDING: "warn",
	PENDING_PAYMENT: "warn",
	REFUND_PENDING: "warn",
	DUE: "warn",
	DISABLED: "warn",
	USED: "warn",
	CANCELLED: "bad",
	EXPIRED: "bad",
	OVERDUE: "bad",
	LOCKED: "bad",
	FAILED: "bad",
	VOID: "neutral",
	ARCHIVED: "neutral",
};

export function statusLabel(status: string) {
	return LABELS[status] ?? status;
}

export function statusTone(status: string): BadgeTone {
	return TONES[status] ?? "neutral";
}
