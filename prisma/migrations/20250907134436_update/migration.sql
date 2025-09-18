/*
  Warnings:

  - You are about to drop the column `settingsId` on the `HomePage` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `becomehost` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `blog` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `cancellationPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `career` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `communityGuidelines` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `contactinformation` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `feedback` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `helpfaqs` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `privacyPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `termsAndService` table. All the data in the column will be lost.
  - You are about to drop the column `settingsId` on the `trustandSafety` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."HomePage" DROP CONSTRAINT "HomePage_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."becomehost" DROP CONSTRAINT "becomehost_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."blog" DROP CONSTRAINT "blog_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."cancellationPolicy" DROP CONSTRAINT "cancellationPolicy_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."career" DROP CONSTRAINT "career_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."communityGuidelines" DROP CONSTRAINT "communityGuidelines_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."contactinformation" DROP CONSTRAINT "contactinformation_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."feedback" DROP CONSTRAINT "feedback_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."helpfaqs" DROP CONSTRAINT "helpfaqs_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."privacyPolicy" DROP CONSTRAINT "privacyPolicy_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."termsAndService" DROP CONSTRAINT "termsAndService_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."trustandSafety" DROP CONSTRAINT "trustandSafety_settingsId_fkey";

-- DropIndex
DROP INDEX "public"."HomePage_settingsId_key";

-- DropIndex
DROP INDEX "public"."becomehost_settingsId_key";

-- DropIndex
DROP INDEX "public"."blog_settingsId_key";

-- DropIndex
DROP INDEX "public"."cancellationPolicy_settingsId_key";

-- DropIndex
DROP INDEX "public"."career_settingsId_key";

-- DropIndex
DROP INDEX "public"."communityGuidelines_settingsId_key";

-- DropIndex
DROP INDEX "public"."contactinformation_settingsId_key";

-- DropIndex
DROP INDEX "public"."feedback_settingsId_key";

-- DropIndex
DROP INDEX "public"."privacyPolicy_settingsId_key";

-- DropIndex
DROP INDEX "public"."termsAndService_settingsId_key";

-- DropIndex
DROP INDEX "public"."trustandSafety_settingsId_key";

-- AlterTable
ALTER TABLE "public"."HomePage" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."becomehost" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."blog" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."cancellationPolicy" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."career" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."communityGuidelines" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."contactinformation" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."feedback" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."helpfaqs" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."privacyPolicy" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."termsAndService" DROP COLUMN "settingsId";

-- AlterTable
ALTER TABLE "public"."trustandSafety" DROP COLUMN "settingsId";
