ALTER TABLE "Refund" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "ticketIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "initiatedByUserId" TEXT, ADD COLUMN "resolvedByUserId" TEXT, ADD COLUMN "resolvedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX "Refund_orderId_status_idx" ON "Refund"("orderId", "status");
