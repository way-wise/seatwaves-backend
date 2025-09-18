/*
  Warnings:

  - You are about to drop the `_HelpFaqTobecomehost` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[settingsId]` on the table `HomePage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `becomehost` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `blog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `cancellationPolicy` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `career` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `communityGuidelines` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `feedback` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `privacyPolicy` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `termsAndService` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[settingsId]` on the table `trustandSafety` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `settingsId` to the `HomePage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `becomehost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `cancellationPolicy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `career` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `communityGuidelines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `privacyPolicy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `termsAndService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingsId` to the `trustandSafety` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."_HelpFaqTobecomehost" DROP CONSTRAINT "_HelpFaqTobecomehost_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_HelpFaqTobecomehost" DROP CONSTRAINT "_HelpFaqTobecomehost_B_fkey";

-- AlterTable
ALTER TABLE "public"."HomePage" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."becomehost" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."blog" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."cancellationPolicy" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."career" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."communityGuidelines" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."feedback" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."helpfaqs" ADD COLUMN     "settingsId" TEXT;

-- AlterTable
ALTER TABLE "public"."privacyPolicy" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."termsAndService" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."trustandSafety" ADD COLUMN     "settingsId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."_HelpFaqTobecomehost";

-- CreateTable
CREATE TABLE "public"."settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "siteLogo" TEXT,
    "siteFavicon" TEXT,
    "siteDescription" TEXT,
    "siteKeywords" TEXT,
    "siteEmail" TEXT,
    "sitePhone" TEXT,
    "siteAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contactinformation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "secondaryEmail" TEXT,
    "phone" TEXT NOT NULL,
    "phoneMessage" TEXT,
    "secondaryPhone" TEXT,
    "address" TEXT,
    "secondaryAddress" TEXT,
    "businessHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settingsId" TEXT NOT NULL,

    CONSTRAINT "contactinformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_BecomeHostToHelpFaq" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BecomeHostToHelpFaq_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "settings_createdAt_idx" ON "public"."settings"("createdAt");

-- CreateIndex
CREATE INDEX "settings_updatedAt_idx" ON "public"."settings"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "contactinformation_settingsId_key" ON "public"."contactinformation"("settingsId");

-- CreateIndex
CREATE INDEX "_BecomeHostToHelpFaq_B_index" ON "public"."_BecomeHostToHelpFaq"("B");

-- CreateIndex
CREATE UNIQUE INDEX "HomePage_settingsId_key" ON "public"."HomePage"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "becomehost_settingsId_key" ON "public"."becomehost"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_settingsId_key" ON "public"."blog"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "cancellationPolicy_settingsId_key" ON "public"."cancellationPolicy"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "career_settingsId_key" ON "public"."career"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "communityGuidelines_settingsId_key" ON "public"."communityGuidelines"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_settingsId_key" ON "public"."feedback"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "privacyPolicy_settingsId_key" ON "public"."privacyPolicy"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "termsAndService_settingsId_key" ON "public"."termsAndService"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "trustandSafety_settingsId_key" ON "public"."trustandSafety"("settingsId");

-- AddForeignKey
ALTER TABLE "public"."blog" ADD CONSTRAINT "blog_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."helpfaqs" ADD CONSTRAINT "helpfaqs_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomePage" ADD CONSTRAINT "HomePage_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."becomehost" ADD CONSTRAINT "becomehost_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contactinformation" ADD CONSTRAINT "contactinformation_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."privacyPolicy" ADD CONSTRAINT "privacyPolicy_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."termsAndService" ADD CONSTRAINT "termsAndService_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trustandSafety" ADD CONSTRAINT "trustandSafety_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communityGuidelines" ADD CONSTRAINT "communityGuidelines_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cancellationPolicy" ADD CONSTRAINT "cancellationPolicy_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."career" ADD CONSTRAINT "career_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "public"."settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BecomeHostToHelpFaq" ADD CONSTRAINT "_BecomeHostToHelpFaq_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."helpfaqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BecomeHostToHelpFaq" ADD CONSTRAINT "_BecomeHostToHelpFaq_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."becomehost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
