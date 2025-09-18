-- AlterTable
ALTER TABLE "public"."testimonial" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "testimonial_isActive_idx" ON "public"."testimonial"("isActive");
