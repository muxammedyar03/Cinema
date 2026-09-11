-- CreateTable
CREATE TABLE "CinemaFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CinemaFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CinemaFollow_cinemaId_idx" ON "CinemaFollow"("cinemaId");

-- CreateIndex
CREATE INDEX "CinemaFollow_userId_idx" ON "CinemaFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CinemaFollow_userId_cinemaId_key" ON "CinemaFollow"("userId", "cinemaId");

-- AddForeignKey
ALTER TABLE "CinemaFollow" ADD CONSTRAINT "CinemaFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinemaFollow" ADD CONSTRAINT "CinemaFollow_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
