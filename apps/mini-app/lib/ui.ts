/** Class name join. Visual styles live in app/v2.css and use @cinema/ui tokens. */
export function cx(...parts: Array<string | false | null | undefined>) {
	return parts.filter(Boolean).join(" ");
}
