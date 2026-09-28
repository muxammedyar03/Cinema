import { statusLabel, statusTone } from "../lib/status";
import { Badge } from "../lib/ui-kit";

export function StatusBadge({ status }: { status: string }) {
	return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}
