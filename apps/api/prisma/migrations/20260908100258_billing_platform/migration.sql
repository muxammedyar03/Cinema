-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DUE', 'PAID', 'OVERDUE', 'VOID');

-- AlterEnum
ALTER TYPE "CinemaStatus" ADD VALUE 'LOCKED';

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultCommissionUzs" INTEGER NOT NULL DEFAULT 500,
    "lockAfterDays" INTEGER NOT NULL DEFAULT 7,
    "notifyHourTashkent" INTEGER NOT NULL DEFAULT 9,
    "notifyTelegram" BOOLEAN NOT NULL DEFAULT true,
    "notifyApp" BOOLEAN NOT NULL DEFAULT true,
    "lateMessageTemplate" TEXT NOT NULL DEFAULT 'Подписка Cinema Platform просрочена на {{days}} дн. Оплатите инвойс {{invoice}}, иначе доступ будет закрыт через {{left}} дн.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CinemaBilling" (
    "cinemaId" TEXT NOT NULL,
    "monthlyPlanUzs" INTEGER NOT NULL DEFAULT 2500000,
    "commissionPerTicketUzs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CinemaBilling_pkey" PRIMARY KEY ("cinemaId")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amountUzs" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DUE',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lastLateNotifiedOn" TIMESTAMP(3),
    "publicNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_publicNumber_key" ON "SubscriptionInvoice"("publicNumber");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_status_dueAt_idx" ON "SubscriptionInvoice"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_cinemaId_periodYear_periodMonth_key" ON "SubscriptionInvoice"("cinemaId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "CinemaBilling" ADD CONSTRAINT "CinemaBilling_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
