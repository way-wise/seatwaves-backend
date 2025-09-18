/*
  Warnings:

  - Added the required column `type` to the `activity_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."activity_log" ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "ipAddress" DROP NOT NULL;
