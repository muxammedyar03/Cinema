-- KAN-35: follow digest — additive only.

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Session_cinemaId_status_notifiedAt_idx" ON "Session"("cinemaId", "status", "notifiedAt");

-- Backfill: sessions that were already PUBLISHED before this release are treated as announced,
-- so the first digest after deploy does not re-announce the whole existing afisha.
UPDATE "Session" SET "notifiedAt" = "updatedAt" WHERE "status" = 'PUBLISHED' AND "notifiedAt" IS NULL;
