-- CreateTable
CREATE TABLE "public"."featured_experiences" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_experiences_experienceId_key" ON "public"."featured_experiences"("experienceId");

-- CreateIndex
CREATE INDEX "featured_experiences_createdAt_idx" ON "public"."featured_experiences"("createdAt");

-- CreateIndex
CREATE INDEX "featured_experiences_experienceId_idx" ON "public"."featured_experiences"("experienceId");

-- AddForeignKey
ALTER TABLE "public"."featured_experiences" ADD CONSTRAINT "featured_experiences_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;
