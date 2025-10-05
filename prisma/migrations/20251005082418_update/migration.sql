/*
  Warnings:

  - You are about to drop the column `number` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `row` on the `seats` table. All the data in the column will be lost.
  - You are about to drop the column `section` on the `seats` table. All the data in the column will be lost.
  - Added the required column `sellerId` to the `seats` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."seats_seatId_eventId_key";

-- AlterTable
ALTER TABLE "public"."seats" DROP COLUMN "number",
DROP COLUMN "row",
DROP COLUMN "section",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "seatNumber" TEXT,
ADD COLUMN     "sellerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "seats_sellerId_idx" ON "public"."seats"("sellerId");

-- CreateIndex
CREATE INDEX "seats_seatNumber_idx" ON "public"."seats"("seatNumber");

-- AddForeignKey
ALTER TABLE "public"."seats" ADD CONSTRAINT "seats_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
