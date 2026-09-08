-- AlterTable: add nullable first, backfill from sessions / default cinema, then require
ALTER TABLE "Movie" ADD COLUMN "cinemaId" TEXT;

UPDATE "Movie" m
SET "cinemaId" = s."cinemaId"
FROM (
  SELECT DISTINCT ON ("movieId") "movieId", "cinemaId"
  FROM "Session"
  ORDER BY "movieId", "createdAt" ASC
) s
WHERE m.id = s."movieId" AND m."cinemaId" IS NULL;

UPDATE "Movie"
SET "cinemaId" = 'seed-magic-cinema'
WHERE "cinemaId" IS NULL
  AND EXISTS (SELECT 1 FROM "Cinema" WHERE id = 'seed-magic-cinema');

UPDATE "Movie"
SET "cinemaId" = (SELECT id FROM "Cinema" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "cinemaId" IS NULL;

ALTER TABLE "Movie" ALTER COLUMN "cinemaId" SET NOT NULL;

CREATE INDEX "Movie_cinemaId_status_idx" ON "Movie"("cinemaId", "status");

ALTER TABLE "Movie" ADD CONSTRAINT "Movie_cinemaId_fkey"
  FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
