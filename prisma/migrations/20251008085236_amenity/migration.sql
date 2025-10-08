-- CreateTable
CREATE TABLE "public"."amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_amenities" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "event_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amenities_slug_key" ON "public"."amenities"("slug");

-- CreateIndex
CREATE INDEX "amenities_createdAt_idx" ON "public"."amenities"("createdAt");

-- CreateIndex
CREATE INDEX "amenities_name_idx" ON "public"."amenities"("name");

-- CreateIndex
CREATE INDEX "amenities_slug_idx" ON "public"."amenities"("slug");

-- CreateIndex
CREATE INDEX "event_amenities_amenityId_idx" ON "public"."event_amenities"("amenityId");

-- CreateIndex
CREATE INDEX "event_amenities_eventId_idx" ON "public"."event_amenities"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_amenities_eventId_amenityId_key" ON "public"."event_amenities"("eventId", "amenityId");

-- AddForeignKey
ALTER TABLE "public"."event_amenities" ADD CONSTRAINT "event_amenities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_amenities" ADD CONSTRAINT "event_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "public"."amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
