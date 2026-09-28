"use client";

import { dayNumber, weekdayShort } from "../lib/format";
import { cx } from "../lib/ui";

export function DateStrip({
	days,
	active,
	onSelect,
}: {
	days: string[];
	active: string;
	onSelect: (day: string) => void;
}) {
	return (
		<fieldset className="dates">
			<legend className="sr-only">Дата</legend>
			{days.map((day) => {
				const on = day === active;
				return (
					<button
						key={day}
						type="button"
						className={cx("date", on && "active")}
						aria-pressed={on}
						onClick={() => onSelect(day)}
					>
						{weekdayShort(day)}
						<b>{dayNumber(day)}</b>
					</button>
				);
			})}
		</fieldset>
	);
}
