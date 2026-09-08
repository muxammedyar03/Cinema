"use client";

export function RevenueChart({
	points,
}: {
	points: Array<{ date: string; incomeUzs: number; expenseUzs: number; netUzs: number }>;
}) {
	const max = Math.max(
		1,
		...points.map((p) => Math.max(p.incomeUzs, p.expenseUzs, Math.abs(p.netUzs))),
	);
	const w = 560;
	const h = 300;
	const pad = 12;
	const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

	function line(key: "incomeUzs" | "expenseUzs" | "netUzs") {
		return points
			.map((p, i) => {
				const x = pad + i * step;
				const y = h - pad - (Math.max(0, p[key]) / max) * (h - pad * 2);
				return `${i === 0 ? "M" : "L"}${x},${y}`;
			})
			.join(" ");
	}

	return (
		<div className="w-full">
			<svg
				viewBox={`0 0 ${w} ${h}`}
				className="block h-64 w-full"
				role="img"
				aria-label="Доходы и расходы за 7 дней"
			>
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
				<path d={line("incomeUzs")} fill="none" stroke="#3dcf8e" strokeWidth="2.5" />
				<path
					d={line("expenseUzs")}
					fill="none"
					stroke="#ff5a5a"
					strokeWidth="2"
					strokeDasharray="4 4"
				/>
				<path d={line("netUzs")} fill="none" stroke="#ff6a1a" strokeWidth="2" />
			</svg>
			<div className="flex gap-3.5 px-2 pb-1 text-[11px] text-muted">
				<span className="before:mr-1.5 before:inline-block before:h-0.5 before:w-2.5 before:rounded-sm before:bg-ok before:align-middle">
					Доход
				</span>
				<span className="before:mr-1.5 before:inline-block before:h-0.5 before:w-2.5 before:rounded-sm before:bg-bad before:align-middle">
					Расход
				</span>
				<span className="before:mr-1.5 before:inline-block before:h-0.5 before:w-2.5 before:rounded-sm before:bg-orange before:align-middle">
					Итог
				</span>
			</div>
			<div className="grid grid-cols-7 gap-1 px-2 pb-3 text-center text-[10px] text-muted">
				{points.map((p) => (
					<span key={p.date}>{p.date.slice(5)}</span>
				))}
			</div>
		</div>
	);
}
