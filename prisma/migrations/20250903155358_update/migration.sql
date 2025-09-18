/*
  Warnings:

  - You are about to drop the column `slug` on the `HomePage` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."HomePage_slug_key";

-- AlterTable
ALTER TABLE "public"."HomePage" DROP COLUMN "slug",
ADD COLUMN     "description" TEXT;
