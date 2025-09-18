/*
  Warnings:

  - You are about to drop the `HomePage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."HomePage" DROP CONSTRAINT "HomePage_seoId_fkey";

-- DropTable
DROP TABLE "public"."HomePage";

-- CreateTable
CREATE TABLE "public"."hero_section" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortName" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_section_createdAt_idx" ON "public"."hero_section"("createdAt");

-- CreateIndex
CREATE INDEX "hero_section_updatedAt_idx" ON "public"."hero_section"("updatedAt");
