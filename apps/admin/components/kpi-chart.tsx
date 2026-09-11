"use client";

export type ChartSeries = {
	label: string;
	color: string;
	dashed?: boolean;
	values: Array<number | null>;
};

export function KpiChart({
	labels,
	series,
	ariaLabel,
	kind,
}: {
	labels: string[];
	series: ChartSeries[];
	ariaLabel: string;
	kind: "money" | "percent";
}) {
	const nums = series.flatMap((s) => s.values.map((v) => v ?? 0));
	const max = Math.max(1, ...nums);
	const w = 560;
	const h = 220;
	const pad = 14;
	const step = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0;

	function path(values: Array<number | null>) {
		return values
			.map((raw, i) => {
				const v = raw ?? 0;
				const x = pad + i * step;
				const y = h - pad - (Math.max(0, v) / max) * (h - pad * 2);
				return `${i === 0 ? "M" : "L"}${x},${y}`;
			})
			.join(" ");
	}

	return (
		<div className="w-full">
			<svg
				viewBox={`0 0 ${w} ${h}`}
				className="block h-48 w-full"
				role="img"
				aria-label={ariaLabel}
			>
				<text
					x={w - pad}
					y={pad + 2}
					textAnchor="end"
					fill="currentColor"
					fontSize="10"
					opacity="0.45"
				>
					{kind === "percent" ? "100%" : ""}
				</text>
				{[0.25, 0.5, 0.75].map((t) => (
					<line
						key={t}
						x1={pad}
						x2={w - pad}
						y1={h - pad - t * (h - pad * 2)}
						y2={h - pad - t * (h - pad * 2)}
						stroke="rgba(255,255,255,0.06)"
					/>
				))}
				{series.map((s) => (
					<path
						key={s.label}
						d={path(s.values)}
						fill="none"
						stroke={s.color}
						strokeWidth={s.dashed ? 2 : 2.5}
						strokeDasharray={s.dashed ? "4 4" : undefined}
					/>
				))}
			</svg>
			<div className="flex flex-wrap gap-3.5 px-2 pb-1 text-[11px] text-muted">
				{series.map((s) => (
					<span key={s.label} className="inline-flex items-center gap-1.5">
						<span
							className="inline-block h-0.5 w-2.5 rounded-sm"
							style={{
								background: s.dashed ? "transparent" : s.color,
								borderTop: s.dashed ? `1.5px dashed ${s.color}` : undefined,
							}}
						/>
						{s.label}
					</span>
				))}
			</div>
			<div
				className="grid gap-1 px-2 pb-3 text-center text-[10px] text-muted"
				style={{ gridTemplateColumns: `repeat(${Math.max(1, labels.length)}, minmax(0, 1fr))` }}
			>
				{labels.map((label) => (
					<span key={label}>{label}</span>
				))}
			</div>
		</div>
	);
}
