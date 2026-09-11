-- CreateEnum
CREATE TYPE "MapProvider" AS ENUM ('google', 'yandex');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Cinema" ADD COLUMN     "lat" DECIMAL(10,7),
ADD COLUMN     "lng" DECIMAL(10,7),
ADD COLUMN     "mapProvider" "MapProvider",
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "telegramContact" TEXT,
ADD COLUMN     "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stepPhotosDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stepLocationDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stepInstagramDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stepPhonesDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stepTelegramContactDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stepSecurityEmailDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileComplete" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Cinema"
SET "phones" = ARRAY["phone"]
WHERE "phone" IS NOT NULL AND btrim("phone") <> '' AND cardinality("phones") = 0;

-- CreateTable
CREATE TABLE "CinemaPhoto" (
    "id" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CinemaPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CinemaPhoto_cinemaId_sortOrder_idx" ON "CinemaPhoto"("cinemaId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CinemaPhoto" ADD CONSTRAINT "CinemaPhoto_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
