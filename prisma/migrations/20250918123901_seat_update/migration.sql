/*
  Warnings:

  - You are about to drop the column `guestCount` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `price` to the `seats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."bookings" DROP COLUMN "guestCount",
DROP COLUMN "startDate";

-- AlterTable
ALTER TABLE "public"."seats" ADD COLUMN     "dicount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" "public"."DiscountType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "metaData" JSONB,
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "section" TEXT;
