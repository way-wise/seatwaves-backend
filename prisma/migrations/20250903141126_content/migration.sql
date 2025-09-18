-- CreateEnum
CREATE TYPE "public"."ChangeFrequency" AS ENUM ('ALWAYS', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'NEVER');

-- AlterEnum
ALTER TYPE "public"."HelpFaqStatus" ADD VALUE 'QUESTIONS';

-- CreateTable
CREATE TABLE "public"."HomePage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "seoId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeoMetadata" (
    "id" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "canonicalUrl" VARCHAR(2048),
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogType" TEXT,
    "ogSiteName" TEXT,
    "twitterCard" TEXT,
    "twitterSite" TEXT,
    "twitterCreator" TEXT,
    "locale" VARCHAR(10),
    "hreflangAlternates" JSONB,
    "structuredData" JSONB,
    "changefreq" "public"."ChangeFrequency",
    "priority" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AboutPage" (
    "id" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subHeading" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badgeTitle" TEXT,
    "designation" TEXT,
    "image" TEXT,
    "title" TEXT,
    "description" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AboutPageToHelpFaq" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AboutPageToHelpFaq_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_AboutPageTocard" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AboutPageTocard_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomePage_slug_key" ON "public"."HomePage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HomePage_seoId_key" ON "public"."HomePage"("seoId");

-- CreateIndex
CREATE INDEX "HomePage_isActive_idx" ON "public"."HomePage"("isActive");

-- CreateIndex
CREATE INDEX "HomePage_createdAt_idx" ON "public"."HomePage"("createdAt");

-- CreateIndex
CREATE INDEX "HomePage_updatedAt_idx" ON "public"."HomePage"("updatedAt");

-- CreateIndex
CREATE INDEX "SeoMetadata_canonicalUrl_idx" ON "public"."SeoMetadata"("canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "AboutPage_seoId_key" ON "public"."AboutPage"("seoId");

-- CreateIndex
CREATE INDEX "AboutPage_isActive_idx" ON "public"."AboutPage"("isActive");

-- CreateIndex
CREATE INDEX "AboutPage_createdAt_idx" ON "public"."AboutPage"("createdAt");

-- CreateIndex
CREATE INDEX "AboutPage_updatedAt_idx" ON "public"."AboutPage"("updatedAt");

-- CreateIndex
CREATE INDEX "banner_isActive_idx" ON "public"."banner"("isActive");

-- CreateIndex
CREATE INDEX "banner_createdAt_idx" ON "public"."banner"("createdAt");

-- CreateIndex
CREATE INDEX "banner_updatedAt_idx" ON "public"."banner"("updatedAt");

-- CreateIndex
CREATE INDEX "card_isActive_idx" ON "public"."card"("isActive");

-- CreateIndex
CREATE INDEX "card_createdAt_idx" ON "public"."card"("createdAt");

-- CreateIndex
CREATE INDEX "card_updatedAt_idx" ON "public"."card"("updatedAt");

-- CreateIndex
CREATE INDEX "testimonial_isActive_idx" ON "public"."testimonial"("isActive");

-- CreateIndex
CREATE INDEX "testimonial_createdAt_idx" ON "public"."testimonial"("createdAt");

-- CreateIndex
CREATE INDEX "testimonial_updatedAt_idx" ON "public"."testimonial"("updatedAt");

-- CreateIndex
CREATE INDEX "_AboutPageToHelpFaq_B_index" ON "public"."_AboutPageToHelpFaq"("B");

-- CreateIndex
CREATE INDEX "_AboutPageTocard_B_index" ON "public"."_AboutPageTocard"("B");

-- AddForeignKey
ALTER TABLE "public"."HomePage" ADD CONSTRAINT "HomePage_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AboutPage" ADD CONSTRAINT "AboutPage_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AboutPageToHelpFaq" ADD CONSTRAINT "_AboutPageToHelpFaq_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AboutPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AboutPageToHelpFaq" ADD CONSTRAINT "_AboutPageToHelpFaq_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."helpfaqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AboutPageTocard" ADD CONSTRAINT "_AboutPageTocard_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AboutPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AboutPageTocard" ADD CONSTRAINT "_AboutPageTocard_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
