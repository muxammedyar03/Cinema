-- CreateEnum
CREATE TYPE "AudioLanguage" AS ENUM ('ru', 'uz');

-- AlterTable
ALTER TABLE "Cinema" ADD COLUMN     "city" TEXT,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "CinemaPhoto" ADD COLUMN     "caption" VARCHAR(160);

-- AlterTable
ALTER TABLE "CinemaStaff" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Hall" ADD COLUMN     "format" TEXT;

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "audioLanguage" "AudioLanguage";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "login" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
