ALTER TYPE "PaymentProvider" ADD VALUE 'RAHMAT';
CREATE TABLE "RahmatCheckout" (
 "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT, "subscriptionInvoiceId" TEXT,
 "userId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "amountTiyin" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'CREATING', "providerUuid" TEXT,
 "payUrl" TEXT, "deeplinkUrl" TEXT, "otpRequired" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "RahmatCheckout_orderId_key" ON "RahmatCheckout"("orderId");
CREATE UNIQUE INDEX "RahmatCheckout_subscriptionInvoiceId_key" ON "RahmatCheckout"("subscriptionInvoiceId");
CREATE UNIQUE INDEX "RahmatCheckout_providerUuid_key" ON "RahmatCheckout"("providerUuid");
CREATE TABLE "RahmatCardBinding" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
 "sessionId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RahmatCardBinding_sessionId_key" ON "RahmatCardBinding"("sessionId");
CREATE INDEX "RahmatCardBinding_userId_purpose_idx" ON "RahmatCardBinding"("userId", "purpose");

ALTER TABLE "RahmatCheckout" ADD CONSTRAINT "RahmatCheckout_obligation_check" CHECK (("orderId" IS NOT NULL)::integer + ("subscriptionInvoiceId" IS NOT NULL)::integer = 1);
ALTER TABLE "RahmatCheckout" ADD CONSTRAINT "RahmatCheckout_amount_check" CHECK ("amountTiyin" > 0);
