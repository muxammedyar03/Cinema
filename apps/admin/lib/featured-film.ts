/** Optional KAN-37 field. Absent means the API does not return it yet. */

export const FEATURED_WARNING =
	"В каталоге только один такой фильм. Если включить, предыдущий будет снят.";

export const FEATURED_SAVE_ERROR =
	"Не удалось сохранить «В центре внимания». Сервер пока не принимает это поле.";

export function featuredBadgeVisible(movie: { isFeatured?: boolean | null }): boolean {
	return movie.isFeatured === true;
}

/** Value to send, or undefined when the optional field should be omitted. */
export function featuredWrite(initial: boolean | undefined, next: boolean): boolean | undefined {
	if (next && initial !== true) return true;
	if (!next && initial === true) return false;
	return undefined;
}

export function featuredClears(
	movies: Array<{ id: string; isFeatured?: boolean | null }>,
	keepId: string,
): string[] {
	return movies
		.filter((movie) => movie.id !== keepId && movie.isFeatured === true)
		.map((movie) => movie.id);
}

export function featuredAccepted(
	expected: boolean,
	movie: { isFeatured?: boolean | null },
): boolean {
	return movie.isFeatured === expected;
}

export class OptionalFieldError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OptionalFieldError";
	}
}

export function isOptionalFieldError(err: unknown): err is OptionalFieldError {
	return err instanceof Error && err.name === "OptionalFieldError";
}
