/** Shared Tailwind snippets — aligned with design/admin-New.html */
export const ui = {
	brand: "font-brand text-[21px] font-extrabold tracking-tight text-ink",
	sub: "mt-1.5 mb-0 max-w-[520px] text-[13px] leading-normal text-muted",
	card: "mb-4 overflow-hidden rounded-xl border border-line bg-surface",
	cardH:
		"flex flex-wrap items-center justify-between gap-3 border-b border-line px-[18px] py-3.5 text-sm font-semibold text-ink",
	btn: "inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-4 font-ui text-[13px] font-semibold transition-opacity hover:opacity-90",
	btnPri: "bg-orange text-[#171310]",
	btnGhost: "border-line-strong bg-transparent text-ink hover:border-muted",
	btnWarn: "border-[rgba(193,84,63,0.5)] bg-transparent text-bad hover:border-bad",
	btnSm: "h-[31px] rounded-md px-3 text-xs",
	field: "mb-3.5 flex flex-col gap-1.5",
	label: "text-xs font-medium text-muted",
	input:
		"w-full rounded-lg border border-line-strong bg-elev px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-orange/50",
	badge: "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold",
	badgeOk: "bg-ok/16 text-ok",
	badgeMuted: "bg-ink/6 text-muted",
	badgeWarn: "bg-warn/16 text-warn",
	badgeBad: "bg-bad/16 text-bad",
	badgeOrange: "bg-orange/16 text-orange",
	err: "mb-3 text-[13px] text-bad",
	okMsg: "mb-3 text-[13px] text-ok",
	row: "mb-[22px] flex flex-wrap items-end justify-between gap-4",
	hint: "mt-1 text-[11px] text-faint",
	chip: "cursor-pointer rounded-full border border-line-strong bg-transparent px-3.5 py-1.5 font-ui text-xs font-medium text-muted",
	chipOn: "border-orange bg-orange font-semibold text-[#171310]",
	pageTitle: "font-brand text-[26px] font-extrabold tracking-tight text-ink",
} as const;

export function cx(...parts: Array<string | false | null | undefined>) {
	return parts.filter(Boolean).join(" ");
}
