import { Badge } from "@cinema/ui";
import { audioBadge } from "../lib/afisha";
import { formatPrice, formatTime } from "../lib/format";
import type { CatalogSession } from "../lib/types";
import { cx } from "../lib/ui";

export function SessionChip({
	session,
	active,
	onSelect,
}: {
	session: CatalogSession;
	active?: boolean;
	onSelect: () => void;
}) {
	const language = audioBadge(session.audioLanguage);
	return (
		<button
			type="button"
			className={cx("time", active && "active")}
			aria-pressed={Boolean(active)}
			onClick={onSelect}
		>
			{formatTime(session.startsAt)}
			<small>{formatPrice(session.basePriceUzs)}</small>
			<span className={cx("seats-left", session.remaining <= 5 && "few")}>
				{session.remaining} мест
			</span>
			{language ? (
				<span className="lang-badge">
					<Badge tone="blue">{language}</Badge>
				</span>
			) : null}
		</button>
	);
}
