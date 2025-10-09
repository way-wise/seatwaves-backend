/*
  Warnings:

  - You are about to drop the column `seatId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the `seats` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ticketId` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."bookings" DROP CONSTRAINT "bookings_seatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."seats" DROP CONSTRAINT "seats_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."seats" DROP CONSTRAINT "seats_sellerId_fkey";

-- AlterTable
ALTER TABLE "public"."bookings" DROP COLUMN "seatId",
ADD COLUMN     "ticketId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "latitude" TEXT,
ADD COLUMN     "longitude" TEXT,
ADD COLUMN     "originUrl" TEXT,
ADD COLUMN     "seatmapImage" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "venueImage" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "cover" TEXT;

-- DropTable
DROP TABLE "public"."seats";

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "ticketType" TEXT,
    "eventId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'FIXED',
    "seatDetails" TEXT NOT NULL,
    "thumbnail" TEXT,
    "description" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_eventId_idx" ON "public"."tickets"("eventId");

-- CreateIndex
CREATE INDEX "tickets_sellerId_idx" ON "public"."tickets"("sellerId");

-- CreateIndex
CREATE INDEX "tickets_seatDetails_idx" ON "public"."tickets"("seatDetails");

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
