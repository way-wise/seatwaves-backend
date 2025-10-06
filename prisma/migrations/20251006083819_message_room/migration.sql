/*
  Warnings:

  - A unique constraint covering the columns `[senderId,receiverId,bookingId]` on the table `message_rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."message_rooms" DROP CONSTRAINT "message_rooms_eventId_fkey";

-- DropIndex
DROP INDEX "public"."message_rooms_senderId_receiverId_eventId_key";

-- AlterTable
ALTER TABLE "public"."message_rooms" ALTER COLUMN "eventId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "message_rooms_senderId_receiverId_bookingId_key" ON "public"."message_rooms"("senderId", "receiverId", "bookingId");

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
