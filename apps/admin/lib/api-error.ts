export class ApiError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly body?: unknown;

	constructor(message: string, status: number, code?: string, body?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.body = body;
	}
}

const RU: Record<string, string> = {
	SELF_REFUND_WINDOW_CLOSED: "Окно самостоятельного возврата закрыто",
	TICKET_NOT_REFUNDABLE: "Билет уже использован или возвращён",
	REFUND_AMOUNT_EXCEEDED: "Сумма возврата больше оплаты",
	PAYMENT_NOT_PAID: "Оплата ещё не прошла",
	IDEMPOTENCY_CONFLICT: "Повторный запрос с другими данными",
	PARTIAL_REFUND_UNSUPPORTED: "Частичный возврат пока недоступен в Rahmat",
	TICKET_ALREADY_USED: "Билет уже использован",
	TICKET_NOT_FOUND: "Билет не найден",
	TICKET_NOT_ACTIVE: "Билет недействителен",
	FORBIDDEN: "Нет доступа к этому билету",
	STEP_PRECONDITION_FAILED: "Сначала заполните обязательные поля шага",
	INVALID_INSTAGRAM_URL: "Нужна ссылка на instagram.com",
	INVALID_MAP_PROVIDER: "Выберите Google Maps или Yandex Maps",
	PHOTO_LIMIT: "Можно загрузить не больше 12 фото",
	PHOTO_TOO_LARGE: "Файл больше 5 МБ",
	INVALID_PHOTO_TYPE: "Допустимы JPEG, PNG или WebP",
	NOT_CINEMA_STAFF: "Нет доступа к этому кинотеатру",
	CINEMA_NOT_FOUND: "Кинотеатр не найден",
	INVALID_CURRENT_PASSWORD: "Текущий пароль неверен",
	INVALID_EMAIL_TOKEN: "Код подтверждения недействителен",
	EMAIL_TAKEN: "Этот email уже занят",
	UPLOAD_EXPIRED: "Ссылка загрузки истекла — выберите файл снова",
};

function looksLikeCode(value: string) {
	return /^[A-Z][A-Z0-9_]+$/.test(value);
}

export function parseApiError(text: string, status: number): ApiError {
	try {
		const body = JSON.parse(text) as Record<string, unknown>;
		const nested =
			body.message && typeof body.message === "object" && !Array.isArray(body.message)
				? (body.message as Record<string, unknown>)
				: null;
		const codeRaw = body.code ?? nested?.code;
		const messageRaw = nested?.message ?? body.message ?? body.error;
		const message = Array.isArray(messageRaw)
			? messageRaw.join(", ")
			: typeof messageRaw === "string"
				? messageRaw
				: text;
		const code =
			typeof codeRaw === "string" ? codeRaw : looksLikeCode(message) ? message : undefined;
		return new ApiError(message || `API ${status}`, status, code, body);
	} catch {
		return new ApiError(text || `API ${status}`, status);
	}
}

export function errorText(err: unknown, fallback = "Ошибка запроса"): string {
	if (err instanceof ApiError) {
		if (err.code && RU[err.code]) return RU[err.code];
		if (looksLikeCode(err.message) && RU[err.message]) return RU[err.message];
		if (err.status === 403) return RU.FORBIDDEN;
		if (err.status === 404) return RU.TICKET_NOT_FOUND;
		if (err.status === 409 && err.code && RU[err.code]) return RU[err.code];
		return err.message || fallback;
	}
	if (err instanceof Error && err.message) return err.message;
	return fallback;
}
