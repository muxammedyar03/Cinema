import Link from "next/link";
import { formatPrice, formatTime } from "../lib/format";
import type { CatalogSession } from "../lib/types";
import { cx, ui } from "../lib/ui";

export function SessionChip({
	session,
	href,
	active,
}: {
	session: CatalogSession;
	href?: string;
	active?: boolean;
}) {
	const className = cx(ui.sess, active && ui.sessPick);
	const body = (
		<>
			{formatTime(session.startsAt)}
			<small className={ui.sessMeta}>
				{session.cinemaName} · {session.hallName}
				<br />
				{formatPrice(session.basePriceUzs)} · {session.remaining} мест
			</small>
		</>
	);
	if (href) {
		return (
			<Link href={href} className={className}>
				{body}
			</Link>
		);
	}
	return <div className={className}>{body}</div>;
}
