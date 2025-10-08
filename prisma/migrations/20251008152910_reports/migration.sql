-- CreateEnum
CREATE TYPE "public"."ReportTargetType" AS ENUM ('USER', 'BOOKING', 'EVENT', 'TRANSACTION', 'MESSAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('FRAUD', 'SCAM', 'SPAM', 'ABUSE', 'PAYMENT_ISSUE', 'BOOKING_ISSUE', 'EVENT_ISSUE', 'PLATFORM_BUG', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ReportSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "targetType" "public"."ReportTargetType" NOT NULL DEFAULT 'OTHER',
    "bookingId" TEXT,
    "eventId" TEXT,
    "transactionId" TEXT,
    "messageId" TEXT,
    "type" "public"."ReportType" NOT NULL DEFAULT 'OTHER',
    "severity" "public"."ReportSeverity" NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT,
    "description" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "public"."reports"("status");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "public"."reports"("type");

-- CreateIndex
CREATE INDEX "reports_targetType_idx" ON "public"."reports"("targetType");

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "public"."reports"("reporterId");

-- CreateIndex
CREATE INDEX "reports_reportedUserId_idx" ON "public"."reports"("reportedUserId");

-- CreateIndex
CREATE INDEX "reports_bookingId_idx" ON "public"."reports"("bookingId");

-- CreateIndex
CREATE INDEX "reports_eventId_idx" ON "public"."reports"("eventId");

-- CreateIndex
CREATE INDEX "reports_transactionId_idx" ON "public"."reports"("transactionId");

-- CreateIndex
CREATE INDEX "reports_messageId_idx" ON "public"."reports"("messageId");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "public"."reports"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("bookingId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
