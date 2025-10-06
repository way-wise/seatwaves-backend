-- CreateEnum
CREATE TYPE "public"."AdminBalanceType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "public"."admin_balance" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "public"."AdminBalanceType" NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_balance_reference_idx" ON "public"."admin_balance"("reference");

-- CreateIndex
CREATE INDEX "admin_balance_type_idx" ON "public"."admin_balance"("type");

-- CreateIndex
CREATE INDEX "admin_balance_createdAt_idx" ON "public"."admin_balance"("createdAt");
