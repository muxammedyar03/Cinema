-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "telegramPaymentChargeId" TEXT,
ADD COLUMN "providerPaymentChargeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_telegramPaymentChargeId_key" ON "Payment"("telegramPaymentChargeId");
