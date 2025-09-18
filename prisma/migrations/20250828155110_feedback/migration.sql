/*
  Warnings:

  - The `platform` column on the `feedback` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."PlatformType" AS ENUM ('WEOUT_WEB', 'WEOUT_ANDROID', 'WEOUT_IOS');

-- AlterTable
ALTER TABLE "public"."feedback" DROP COLUMN "platform",
ADD COLUMN     "platform" "public"."PlatformType" NOT NULL DEFAULT 'WEOUT_WEB';
