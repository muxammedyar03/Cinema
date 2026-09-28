/** Optional KAN-37 field: "ru" | "uz" | null. Missing means the API does not return it yet. */

export type SessionLanguage = "ru" | "uz";

export const SESSION_LANGUAGE_SAVE_ERROR =
	"Сеанс создан, но язык не сохранился. Сервер пока не принимает это поле.";

const LABELS: Record<SessionLanguage, string> = {
	ru: "Русский",
	uz: "Узбекский",
};

export function languageBadgeLabel(value: string | null | undefined): string | null {
	if (value == null || value === "") return null;
	if (value === "ru" || value === "uz") return LABELS[value];
	return null;
}

export function languagePayload(value: SessionLanguage | null): {
	audioLanguage?: SessionLanguage;
} {
	if (value == null) return {};
	return { audioLanguage: value };
}

export function languageAccepted(
	requested: SessionLanguage | null,
	saved: { audioLanguage?: string | null },
): boolean {
	if (requested == null) return true;
	return saved.audioLanguage === requested;
}
