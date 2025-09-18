/*
  Warnings:

  - You are about to drop the column `availableAt` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `availableEndAt` on the `events` table. All the data in the column will be lost.
  - The `startTime` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endTime` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `availableAt` on the `experiences` table. All the data in the column will be lost.
  - You are about to drop the column `availableEndAt` on the `experiences` table. All the data in the column will be lost.
  - You are about to drop the column `isRecurring` on the `experiences` table. All the data in the column will be lost.
  - The `startTime` column on the `experiences` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endTime` column on the `experiences` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "public"."events_availableAt_idx";

-- DropIndex
DROP INDEX "public"."events_availableEndAt_idx";

-- DropIndex
DROP INDEX "public"."experiences_availableAt_idx";

-- DropIndex
DROP INDEX "public"."experiences_availableEndAt_idx";

-- DropIndex
DROP INDEX "public"."experiences_isRecurring_idx";

-- AlterTable
ALTER TABLE "public"."RecurrenceRule" ADD COLUMN     "openWindowDays" INTEGER;

-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "availableAt",
DROP COLUMN "availableEndAt",
DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3),
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."experiences" DROP COLUMN "availableAt",
DROP COLUMN "availableEndAt",
DROP COLUMN "isRecurring",
ADD COLUMN     "openWindowDays" INTEGER,
DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3),
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "events_startTime_idx" ON "public"."events"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "events_experienceId_date_startTime_key" ON "public"."events"("experienceId", "date", "startTime");

-- CreateIndex
CREATE INDEX "experiences_openWindowDays_idx" ON "public"."experiences"("openWindowDays");
