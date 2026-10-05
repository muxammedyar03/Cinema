/** Run only against the disposable PostgreSQL CI database, after migrate deploy. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "@cinema/types";
import { PrismaClient } from "@prisma/client";
import { countSessionOccupied } from "../src/booking/capacity";
import { RefundService } from "../src/order/refund.service";
import type { PrismaService } from "../src/prisma/prisma.service";

async function main() {
	if (process.env.REFUND_INTEGRATION_TEST !== "1")
		throw new Error("REFUND_INTEGRATION_TEST=1 required for a disposable database");
	const db = new PrismaClient();
	const key = `refund-ci-${randomUUID()}`;
	const cinemaId = key,
		userId = `${key}-customer`,
		staffId = `${key}-staff`,
		hallId = `${key}-hall`,
		movieId = `${key}-movie`,
		sessionId = `${key}-session`,
		orderId = `${key}-order`;
	const customer = { id: userId, role: "CUSTOMER", staff: [] } as unknown as SessionUser;
	const staff = {
		id: staffId,
		role: "CUSTOMER",
		staff: [{ cinemaId, role: "CINEMA_ADMIN" }],
	} as unknown as SessionUser;
	const service = new RefundService(db as unknown as PrismaService);
	try {
		await db.cinema.create({ data: { id: cinemaId, name: "CI refund cinema" } });
		await db.user.createMany({ data: [{ id: userId }, { id: staffId }] });
		await db.hall.create({ data: { id: hallId, cinemaId, name: "GA", capacity: 20 } });
		await db.movie.create({ data: { id: movieId, cinemaId, title: "CI film", durationMin: 90 } });
		await db.session.create({
			data: {
				id: sessionId,
				cinemaId,
				movieId,
				hallId,
				startsAt: new Date(Date.now() + 86400000),
				basePriceUzs: 45000,
				status: "PUBLISHED",
			},
		});
		await db.order.create({
			data: {
				id: orderId,
				userId,
				cinemaId,
				sessionId,
				status: "PAID",
				totalUzs: 90000,
				items: { create: { type: "GENERAL_ADMISSION", quantity: 2, unitPriceUzs: 45000 } },
				payments: { create: { provider: "CLICK", status: "PAID", amountUzs: 90000 } },
				tickets: {
					create: [
						{ sessionId, type: "GENERAL_ADMISSION", code: `${key}-1` },
						{ sessionId, type: "GENERAL_ADMISSION", code: `${key}-2` },
					],
				},
			},
		});
		const tickets = await db.ticket.findMany({ where: { orderId }, orderBy: { id: "asc" } });
		assert.equal(await countSessionOccupied(db, sessionId), 2);
		const input = { ticketIds: [tickets[0].id], idempotencyKey: randomUUID() };
		// Real row locks serialize these simultaneous duplicate requests.
		const [first, duplicate] = await Promise.all([
			service.request(customer, orderId, input),
			service.request(customer, orderId, input),
		]);
		assert.equal(first.refundId, duplicate.refundId);
		assert.equal(await db.refund.count({ where: { orderId } }), 1);
		assert.equal(await countSessionOccupied(db, sessionId), 2);
		await assert.rejects(
			service.request({ ...customer, id: staffId }, orderId, {
				...input,
				idempotencyKey: randomUUID(),
			}),
		);
		await assert.rejects(
			service.resolve(
				{ ...staff, staff: [{ cinemaId: "other", role: "CINEMA_ADMIN" }] },
				orderId,
				first.refundId,
				{ status: "SUCCEEDED", reference: "CI-PROVIDER-REFUND-1" },
			),
		);
		await service.resolve(staff, orderId, first.refundId, {
			status: "SUCCEEDED",
			reference: "CI-PROVIDER-REFUND-1",
		});
		await service.resolve(staff, orderId, first.refundId, {
			status: "SUCCEEDED",
			reference: "CI-PROVIDER-REFUND-1",
		});
		assert.equal(await countSessionOccupied(db, sessionId), 1);
		assert.equal((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status, "PAID");
		assert.equal(
			(await db.ticket.findUniqueOrThrow({ where: { id: tickets[0].id } })).status,
			"REFUNDED",
		);
		const second = await service.request(customer, orderId, {
			ticketIds: [tickets[1].id],
			idempotencyKey: randomUUID(),
		});
		await service.resolve(staff, orderId, second.refundId, {
			status: "SUCCEEDED",
			reference: "CI-PROVIDER-REFUND-2",
		});
		assert.equal((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status, "REFUNDED");
		assert.equal(await countSessionOccupied(db, sessionId), 0);
		assert.equal((await db.payment.findFirstOrThrow({ where: { orderId } })).status, "REFUNDED");
		process.stdout.write(
			"Refund database integration passed: duplicate lock, ownership, partial/full settlement, GA capacity.\n",
		);
	} finally {
		await db.refund.deleteMany({ where: { orderId } });
		await db.ticket.deleteMany({ where: { orderId } });
		await db.payment.deleteMany({ where: { orderId } });
		await db.orderItem.deleteMany({ where: { orderId } });
		await db.order.deleteMany({ where: { id: orderId } });
		await db.session.deleteMany({ where: { id: sessionId } });
		await db.movie.deleteMany({ where: { id: movieId } });
		await db.hall.deleteMany({ where: { id: hallId } });
		await db.user.deleteMany({ where: { id: { in: [userId, staffId] } } });
		await db.cinema.deleteMany({ where: { id: cinemaId } });
		await db.$disconnect();
	}
}
void main().catch((err) => {
	process.stderr.write(`${String(err)}\n`);
	process.exitCode = 1;
});
