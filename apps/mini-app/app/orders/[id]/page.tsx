import { Suspense } from "react";
import { ui } from "../../../lib/ui";
import { OrderHoldView } from "./order-hold-view";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return (
		<Suspense fallback={<p className={ui.empty}>Загрузка…</p>}>
			<OrderHoldView orderId={id} />
		</Suspense>
	);
}
