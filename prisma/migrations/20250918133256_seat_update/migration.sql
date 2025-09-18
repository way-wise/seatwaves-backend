/*
  Warnings:

  - You are about to drop the column `dicount` on the `seats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."seats" DROP COLUMN "dicount",
ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;
