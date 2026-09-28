import { Suspense } from "react";
import { OrderHoldView } from "./order-hold-view";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return (
		<Suspense fallback={<p className="note">Загрузка…</p>}>
			<OrderHoldView orderId={id} />
		</Suspense>
	);
}
