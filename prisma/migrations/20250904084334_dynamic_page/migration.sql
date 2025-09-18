/*
  Warnings:

  - You are about to drop the column `isActive` on the `testimonial` table. All the data in the column will be lost.
  - You are about to drop the `AboutPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AboutPageToHelpFaq` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AboutPageTocard` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AboutPage" DROP CONSTRAINT "AboutPage_seoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_AboutPageToHelpFaq" DROP CONSTRAINT "_AboutPageToHelpFaq_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_AboutPageToHelpFaq" DROP CONSTRAINT "_AboutPageToHelpFaq_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_AboutPageTocard" DROP CONSTRAINT "_AboutPageTocard_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_AboutPageTocard" DROP CONSTRAINT "_AboutPageTocard_B_fkey";

-- DropIndex
DROP INDEX "public"."testimonial_isActive_idx";

-- AlterTable
ALTER TABLE "public"."testimonial" DROP COLUMN "isActive";

-- DropTable
DROP TABLE "public"."AboutPage";

-- DropTable
DROP TABLE "public"."_AboutPageToHelpFaq";

-- DropTable
DROP TABLE "public"."_AboutPageTocard";

-- CreateTable
CREATE TABLE "public"."becomehost" (
    "id" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subHeading" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "becomehost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."privacyPolicy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."termsAndService" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "termsAndService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trustandSafety" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trustandSafety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."communityGuidelines" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communityGuidelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cancellationPolicy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."career" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_HelpFaqTobecomehost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HelpFaqTobecomehost_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_becomehostTocard" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_becomehostTocard_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "becomehost_seoId_key" ON "public"."becomehost"("seoId");

-- CreateIndex
CREATE INDEX "becomehost_createdAt_idx" ON "public"."becomehost"("createdAt");

-- CreateIndex
CREATE INDEX "becomehost_updatedAt_idx" ON "public"."becomehost"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "privacyPolicy_seoId_key" ON "public"."privacyPolicy"("seoId");

-- CreateIndex
CREATE INDEX "privacyPolicy_createdAt_idx" ON "public"."privacyPolicy"("createdAt");

-- CreateIndex
CREATE INDEX "privacyPolicy_updatedAt_idx" ON "public"."privacyPolicy"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "termsAndService_seoId_key" ON "public"."termsAndService"("seoId");

-- CreateIndex
CREATE INDEX "termsAndService_createdAt_idx" ON "public"."termsAndService"("createdAt");

-- CreateIndex
CREATE INDEX "termsAndService_updatedAt_idx" ON "public"."termsAndService"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "trustandSafety_seoId_key" ON "public"."trustandSafety"("seoId");

-- CreateIndex
CREATE INDEX "trustandSafety_createdAt_idx" ON "public"."trustandSafety"("createdAt");

-- CreateIndex
CREATE INDEX "trustandSafety_updatedAt_idx" ON "public"."trustandSafety"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "communityGuidelines_seoId_key" ON "public"."communityGuidelines"("seoId");

-- CreateIndex
CREATE INDEX "communityGuidelines_createdAt_idx" ON "public"."communityGuidelines"("createdAt");

-- CreateIndex
CREATE INDEX "communityGuidelines_updatedAt_idx" ON "public"."communityGuidelines"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cancellationPolicy_seoId_key" ON "public"."cancellationPolicy"("seoId");

-- CreateIndex
CREATE INDEX "cancellationPolicy_createdAt_idx" ON "public"."cancellationPolicy"("createdAt");

-- CreateIndex
CREATE INDEX "cancellationPolicy_updatedAt_idx" ON "public"."cancellationPolicy"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "career_seoId_key" ON "public"."career"("seoId");

-- CreateIndex
CREATE INDEX "career_createdAt_idx" ON "public"."career"("createdAt");

-- CreateIndex
CREATE INDEX "career_updatedAt_idx" ON "public"."career"("updatedAt");

-- CreateIndex
CREATE INDEX "_HelpFaqTobecomehost_B_index" ON "public"."_HelpFaqTobecomehost"("B");

-- CreateIndex
CREATE INDEX "_becomehostTocard_B_index" ON "public"."_becomehostTocard"("B");

-- AddForeignKey
ALTER TABLE "public"."becomehost" ADD CONSTRAINT "becomehost_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."privacyPolicy" ADD CONSTRAINT "privacyPolicy_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."termsAndService" ADD CONSTRAINT "termsAndService_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trustandSafety" ADD CONSTRAINT "trustandSafety_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communityGuidelines" ADD CONSTRAINT "communityGuidelines_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cancellationPolicy" ADD CONSTRAINT "cancellationPolicy_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."career" ADD CONSTRAINT "career_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_HelpFaqTobecomehost" ADD CONSTRAINT "_HelpFaqTobecomehost_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."helpfaqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_HelpFaqTobecomehost" ADD CONSTRAINT "_HelpFaqTobecomehost_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."becomehost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_becomehostTocard" ADD CONSTRAINT "_becomehostTocard_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."becomehost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_becomehostTocard" ADD CONSTRAINT "_becomehostTocard_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
