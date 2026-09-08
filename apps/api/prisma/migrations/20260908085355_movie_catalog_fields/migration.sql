-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "audioLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MovieStatus" NOT NULL DEFAULT 'ACTIVE';
