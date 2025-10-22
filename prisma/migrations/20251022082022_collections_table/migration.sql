-- CreateEnum
CREATE TYPE "public"."CollectionType" AS ENUM ('WEBALERT', 'SPORTS', 'THEATER', 'CONCERT');

-- CreateTable
CREATE TABLE "public"."collections" (
    "id" TEXT NOT NULL,
    "type" "public"."CollectionType" NOT NULL DEFAULT 'WEBALERT',
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_eventId_key" ON "public"."collections"("eventId");

-- CreateIndex
CREATE INDEX "collections_type_idx" ON "public"."collections"("type");

-- CreateIndex
CREATE INDEX "collections_eventId_idx" ON "public"."collections"("eventId");

-- AddForeignKey
ALTER TABLE "public"."collections" ADD CONSTRAINT "collections_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
