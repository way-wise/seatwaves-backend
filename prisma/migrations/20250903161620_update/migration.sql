/*
  Warnings:

  - You are about to drop the column `canonicalUrl` on the `SeoMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `hreflangAlternates` on the `SeoMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `SeoMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `twitterCard` on the `SeoMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `twitterCreator` on the `SeoMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `twitterSite` on the `SeoMetadata` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."SeoMetadata_canonicalUrl_idx";

-- AlterTable
ALTER TABLE "public"."HomePage" ADD COLUMN     "sortName" TEXT;

-- AlterTable
ALTER TABLE "public"."SeoMetadata" DROP COLUMN "canonicalUrl",
DROP COLUMN "hreflangAlternates",
DROP COLUMN "locale",
DROP COLUMN "twitterCard",
DROP COLUMN "twitterCreator",
DROP COLUMN "twitterSite";
