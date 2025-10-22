/*
  Warnings:

  - You are about to drop the column `createdAt` on the `collections` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `collections` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."collections" DROP CONSTRAINT "collections_eventId_fkey";

-- DropIndex
DROP INDEX "public"."collections_eventId_idx";

-- DropIndex
DROP INDEX "public"."collections_eventId_key";

-- AlterTable
ALTER TABLE "public"."collections" DROP COLUMN "createdAt",
DROP COLUMN "eventId";

-- CreateTable
CREATE TABLE "public"."_EventToCollection" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToCollection_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventToCollection_B_index" ON "public"."_EventToCollection"("B");

-- AddForeignKey
ALTER TABLE "public"."_EventToCollection" ADD CONSTRAINT "_EventToCollection_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_EventToCollection" ADD CONSTRAINT "_EventToCollection_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
