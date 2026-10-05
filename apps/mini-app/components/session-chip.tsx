import { Badge } from "@cinema/ui";
import { audioBadge } from "../lib/afisha";
import { formatPrice, formatTime } from "../lib/format";
import type { CatalogSession } from "../lib/types";
import { cx } from "../lib/ui";

export function SessionChip({
	session,
	active,
	disabled = false,
	onSelect,
}: {
	session: CatalogSession;
	active?: boolean;
	disabled?: boolean;
	onSelect: () => void;
}) {
	const language = audioBadge(session.audioLanguage);
	return (
		<button
			type="button"
			className={cx("time", active && "active", disabled && "time-ended")}
			aria-pressed={Boolean(active)}
			disabled={disabled}
			onClick={onSelect}
		>
			{formatTime(session.startsAt)}
			<small>{disabled ? "Сеанс начался" : formatPrice(session.basePriceUzs)}</small>
			{!disabled ? (
				<span className={cx("seats-left", session.remaining <= 5 && "few")}>
					{session.remaining} мест
				</span>
			) : null}
			{language ? (
				<span className="lang-badge">
					<Badge tone="blue">{language}</Badge>
				</span>
			) : null}
		</button>
	);
}
