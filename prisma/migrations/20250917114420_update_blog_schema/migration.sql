/*
  Warnings:

  - The values [BKASH,NAGAD,ROCKET,MANUAL] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.
  - The values [PURCHASE] on the enum `PointRuleAction` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `ogImage` on the `blog` table. All the data in the column will be lost.
  - You are about to drop the column `seoDescription` on the `blog` table. All the data in the column will be lost.
  - You are about to drop the column `seoTitle` on the `blog` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[seoId]` on the table `blog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."payoutStatus" AS ENUM ('NULL', 'UNPAID', 'PENDING', 'PAID');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentProvider_new" AS ENUM ('STRIPE', 'STRIPE_CONNECT', 'CASH', 'WALLET');
ALTER TABLE "public"."transactions" ALTER COLUMN "provider" TYPE "public"."PaymentProvider_new" USING ("provider"::text::"public"."PaymentProvider_new");
ALTER TYPE "public"."PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "public"."PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "public"."PaymentProvider_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."PointRuleAction_new" AS ENUM ('BOOKING', 'SIGNUP', 'REFERRAL_SIGNUP', 'REFERRAL_PURCHASE', 'REVIEW_SUBMITTED', 'BIRTHDAY_BONUS', 'MANUAL_ADJUSTMENT', 'LOGIN_STREAK', 'SOCIAL_SHARE');
ALTER TABLE "public"."PointRule" ALTER COLUMN "action" TYPE "public"."PointRuleAction_new" USING ("action"::text::"public"."PointRuleAction_new");
ALTER TABLE "public"."RewardPoints" ALTER COLUMN "action" TYPE "public"."PointRuleAction_new" USING ("action"::text::"public"."PointRuleAction_new");
ALTER TYPE "public"."PointRuleAction" RENAME TO "PointRuleAction_old";
ALTER TYPE "public"."PointRuleAction_new" RENAME TO "PointRuleAction";
DROP TYPE "public"."PointRuleAction_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."blog" DROP COLUMN "ogImage",
DROP COLUMN "seoDescription",
DROP COLUMN "seoTitle",
ADD COLUMN     "seoId" TEXT;

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "payoutStatus" "public"."payoutStatus" NOT NULL DEFAULT 'NULL';

-- CreateIndex
CREATE UNIQUE INDEX "blog_seoId_key" ON "public"."blog"("seoId");

-- AddForeignKey
ALTER TABLE "public"."blog" ADD CONSTRAINT "blog_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
