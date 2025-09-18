-- DropForeignKey
ALTER TABLE "public"."activity_log" DROP CONSTRAINT "activity_log_userId_fkey";

-- AlterTable
ALTER TABLE "public"."activity_log" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
