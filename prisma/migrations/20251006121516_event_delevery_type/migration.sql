-- CreateEnum
CREATE TYPE "public"."DeliveryType" AS ENUM ('PHYSICAL_MAIL', 'IN_PERSON_PICKUP', 'ONLINE');

-- AlterTable
ALTER TABLE "public"."bookings" ADD COLUMN     "deliveryType" "public"."DeliveryType" NOT NULL DEFAULT 'ONLINE';
