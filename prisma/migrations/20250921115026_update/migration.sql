/*
  Warnings:

  - You are about to drop the column `metaData` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `metaData` on the `seats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "metaData",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "public"."seats" DROP COLUMN "metaData",
ADD COLUMN     "metadata" JSONB;
