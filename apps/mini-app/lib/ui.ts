/** Shared Tailwind class snippets for Cinema mini-app UI */
export const ui = {
	brand:
		"font-brand text-2xl font-extrabold tracking-tight bg-gradient-to-br from-ink from-35% to-orange bg-clip-text text-transparent",
	cta: "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border-0 bg-orange px-[18px] font-ui text-sm font-bold text-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-60",
	ctaBlock: "w-full",
	ctaGhost: "border border-line bg-transparent text-ink",
	chip: "h-[34px] shrink-0 cursor-pointer rounded-full border border-line bg-white/[0.03] px-3.5 font-ui text-xs font-semibold text-muted",
	chipOn: "border-orange/50 bg-orange/[0.14] text-orange",
	sess: "min-w-[108px] cursor-pointer rounded-[14px] border border-line bg-white/[0.03] px-3 py-2.5 text-left font-ui text-sm font-bold text-ink hover:border-orange/50 hover:bg-orange/[0.12]",
	sessPick: "border-orange/50 bg-orange/[0.12]",
	sessMeta: "mt-1 block font-ui text-[11px] font-medium text-muted",
	empty: "px-[18px] py-7 text-center text-sm leading-normal text-muted",
	backFab:
		"grid size-10 place-items-center rounded-full border border-line bg-elev/80 text-ink backdrop-blur-[8px]",
	hint: "px-[18px] pb-3 text-center text-xs text-muted",
	filters:
		"flex gap-2 overflow-x-auto px-3.5 pt-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
	section: "px-3.5 pt-[18px] pb-1",
	sectionHead: "mb-3 flex items-baseline justify-between",
	sectionTitle: "font-brand text-lg font-bold",
	sectionMeta: "text-xs text-muted",
	rail: "grid auto-cols-[132px] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
	sessions: "flex flex-wrap gap-2",
} as const;

export function cx(...parts: Array<string | false | null | undefined>) {
	return parts.filter(Boolean).join(" ");
}
