/** Form and legacy layout classes. Colors come only from packages/ui tokens. */
export const ui = {
	brand: "font-ui text-[29px] font-extrabold tracking-[-1.3px] text-ink",
	sub: "mt-1.5 mb-0 max-w-[640px] text-[13px] leading-normal text-muted",
	card: "mb-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel text-ink",
	cardH:
		"flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-line)] px-[22px] py-5 text-[15px] font-semibold text-ink",
	btn: "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-button)] border px-4 font-ui text-xs font-semibold no-underline",
	btnPri: "border-primary bg-primary text-[var(--nav-ink)] hover:brightness-[0.96]",
	btnGhost:
		"border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-ink)]",
	btnWarn: "border-[var(--bad)] bg-transparent text-[var(--bad)]",
	btnSm: "min-h-8 rounded-[var(--radius-button)] px-2.5 text-[11px]",
	field: "mb-3.5 flex flex-col gap-1.5",
	label: "text-[13px] font-medium text-muted",
	input:
		"w-full rounded-[var(--radius-control)] border border-[var(--button-secondary-border)] bg-panel px-3 py-[11px] text-sm text-ink outline-none focus:border-primary",
	badge:
		"inline-flex items-center rounded-[var(--radius-badge)] px-2 py-1 font-ui text-[11px] leading-normal font-medium",
	badgeOk: "bg-[var(--ok-bg)] text-[var(--ok)]",
	badgeMuted: "bg-[var(--elev)] text-[var(--muted)]",
	badgeWarn: "bg-[var(--warn-bg)] text-[var(--warn)]",
	badgeBad: "bg-[var(--bad-bg)] text-[var(--bad)]",
	badgeOrange: "bg-[var(--badge-blue-bg)] text-[var(--badge-blue)]",
	err: "mb-3 text-[13px] text-bad",
	okMsg: "mb-3 text-[13px] text-ok",
	row: "mb-6 flex flex-wrap items-end justify-between gap-4",
	hint: "mt-1 text-[11px] text-faint",
	chip: "inline-flex cursor-pointer items-center rounded-[var(--radius-chip)] border border-[var(--chip-border)] bg-[var(--chip-bg)] px-3.5 py-2 font-ui text-xs text-[var(--chip-ink)] no-underline",
	chipOn:
		"border-[var(--chip-active-border)] bg-[var(--chip-active-bg)] font-semibold text-[var(--chip-active-ink)]",
	pageTitle: "font-ui text-[29px] font-bold tracking-[-1px] text-ink",
} as const;

export function cx(...parts: Array<string | false | null | undefined>) {
	return parts.filter(Boolean).join(" ");
}
