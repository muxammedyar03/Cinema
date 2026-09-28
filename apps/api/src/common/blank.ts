/** Empty or whitespace-only strings become null. `undefined` stays `undefined`. */
export function blankToNull(value: string | null | undefined): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}
