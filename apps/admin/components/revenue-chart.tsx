"use client";

export function RevenueChart({
	points,
}: {
	points: Array<{ date: string; incomeUzs: number; expenseUzs: number; netUzs: number }>;
}) {
	const max = Math.max(1, ...points.map((point) => point.incomeUzs));

	return (
		<div className="w-full px-4 pb-4 pt-2">
			<div
				className="flex h-[180px] items-end gap-2"
				role="img"
				aria-label="Выручка по дням"
				style={{
					background:
						"repeating-linear-gradient(to top, transparent 0, transparent 41px, var(--line) 42px)",
				}}
			>
				{points.map((point) => {
					const height = Math.max(0, (point.incomeUzs / max) * 100);
					const label = point.date.slice(5);
					return (
						<div key={point.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
							<div className="flex flex-1 items-end justify-center">
								<div
									className="w-3 max-w-full rounded-t bg-primary"
									style={{ height: `${height}%` }}
									title={`${label}: ${point.incomeUzs.toLocaleString("ru-RU")} сум`}
								/>
							</div>
							<span className="pt-1 text-center text-[10px] text-muted">{label}</span>
						</div>
					);
				})}
			</div>
			<p className="mt-3 text-[11px] text-muted">
				<span className="mr-1.5 inline-block size-1.5 rounded-sm bg-primary align-middle" />
				Текущий период · доход
			</p>
		</div>
	);
}
