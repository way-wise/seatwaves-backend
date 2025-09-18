-- CreateEnum
CREATE TYPE "public"."RewardPointStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."PointRuleAction" AS ENUM ('PURCHASE', 'SIGNUP', 'REFERRAL_SIGNUP', 'REFERRAL_PURCHASE', 'REVIEW_SUBMITTED', 'BIRTHDAY_BONUS', 'MANUAL_ADJUSTMENT', 'LOGIN_STREAK', 'SOCIAL_SHARE');

-- CreateTable
CREATE TABLE "public"."LoyaltyTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "benefits" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PointRule" (
    "id" TEXT NOT NULL,
    "action" "public"."PointRuleAction" NOT NULL,
    "name" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL DEFAULT 0,
    "perUnit" BOOLEAN NOT NULL DEFAULT false,
    "unitAmount" INTEGER,
    "tierMultipliers" JSONB,
    "expiryMonths" INTEGER NOT NULL DEFAULT 12,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RewardPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "action" "public"."PointRuleAction" NOT NULL,
    "points" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "status" "public"."RewardPointStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "referencedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Redemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rewardCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLoyalty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLoyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TierHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldTierId" TEXT,
    "newTierId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledJobLog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "payload" JSONB,

    CONSTRAINT "ScheduledJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTier_name_key" ON "public"."LoyaltyTier"("name");

-- CreateIndex
CREATE INDEX "LoyaltyTier_priority_idx" ON "public"."LoyaltyTier"("priority");

-- CreateIndex
CREATE INDEX "PointRule_action_active_idx" ON "public"."PointRule"("action", "active");

-- CreateIndex
CREATE INDEX "RewardPoints_userId_status_idx" ON "public"."RewardPoints"("userId", "status");

-- CreateIndex
CREATE INDEX "RewardPoints_expiresAt_idx" ON "public"."RewardPoints"("expiresAt");

-- CreateIndex
CREATE INDEX "Redemption_userId_createdAt_idx" ON "public"."Redemption"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLoyalty_userId_key" ON "public"."UserLoyalty"("userId");

-- CreateIndex
CREATE INDEX "TierHistory_userId_createdAt_idx" ON "public"."TierHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."RewardPoints" ADD CONSTRAINT "RewardPoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RewardPoints" ADD CONSTRAINT "RewardPoints_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."PointRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLoyalty" ADD CONSTRAINT "UserLoyalty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLoyalty" ADD CONSTRAINT "UserLoyalty_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "public"."LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TierHistory" ADD CONSTRAINT "TierHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
