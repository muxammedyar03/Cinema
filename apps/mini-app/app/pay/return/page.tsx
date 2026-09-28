"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function PayReturnInner() {
	const params = useSearchParams();
	const router = useRouter();

	useEffect(() => {
		const orderId = params.get("orderId") ?? params.get("order_id");
		const status = params.get("status") ?? params.get("pay") ?? "return";
		if (orderId) {
			router.replace(`/orders/${orderId}?pay=${encodeURIComponent(status)}`);
			return;
		}
		router.replace("/orders");
	}, [params, router]);

	return <p className="note">Возвращаем из Rahmat…</p>;
}

export default function PayReturnPage() {
	return (
		<Suspense fallback={<p className="note">Возвращаем из Rahmat…</p>}>
			<PayReturnInner />
		</Suspense>
	);
}
