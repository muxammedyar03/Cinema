import { BadRequestException, ConflictException } from "@nestjs/common";
export function refundSelection(
	tickets: Array<{ id: string; status: string; seatId: string | null; type: string }>,
	items: Array<{ seatId: string | null; type: string; unitPriceUzs: number }>,
	ids: string[],
) {
	if (!ids.length || new Set(ids).size !== ids.length)
		throw new BadRequestException({
			code: "REFUND_SELECTION_REQUIRED",
			message: "Выберите билеты для возврата",
		});
	const chosen = ids.map((id) => tickets.find((t) => t.id === id));
	if (chosen.some((t) => !t || t.status !== "ACTIVE"))
		throw new ConflictException({
			code: "TICKET_NOT_REFUNDABLE",
			message: "Билет недоступен для возврата",
		});
	const prices = chosen.map((t) => {
		const item = items.find(
			(i) => t && i.type === t.type && (t.type !== "SEAT" || i.seatId === t.seatId),
		);
		if (!item) throw new ConflictException("Цена билета не найдена");
		return item.unitPriceUzs;
	});
	return prices.reduce((sum, price) => sum + price, 0);
}
