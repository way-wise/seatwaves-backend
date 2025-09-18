-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK', 'APPLE', 'CREDENTIAL');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'BLOCKED', 'BANNED', 'PENDING', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."OtpType" AS ENUM ('EMAIL', 'PHONE', 'RESET_PASSWORD', 'CHANGE_PASSWORD', 'TWO_FACTOR', 'VERIFY_EMAIL', 'VERIFY_PHONE');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LoginHistoryStatus" AS ENUM ('SUCCESS', 'FAILED', 'RESET_PASSWORD', 'CHANGE_PASSWORD');

-- CreateEnum
CREATE TYPE "public"."CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('ONGOING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "public"."payoutStatus" AS ENUM ('NULL', 'UNPAID', 'PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('STRIPE', 'STRIPE_CONNECT', 'CASH', 'WALLET');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('BOOKING_PAYMENT', 'COUPON_PURCHASE', 'SELLER_PAYOUT', 'ADMIN_COMMISSION', 'BOOKING_REFUND', 'COUPON_REFUND', 'MANUAL_DEPOSIT', 'MANUAL_WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('NOTIFY', 'BOOKING', 'REVIEW', 'MESSAGE', 'WISHLIST', 'COUPON', 'EVENT', 'PAYMENT', 'SYSTEM', 'ALERT');

-- CreateEnum
CREATE TYPE "public"."BusinessInfoStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."WithdrawalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."HelpFaqStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', 'QUESTIONS');

-- CreateEnum
CREATE TYPE "public"."HelpType" AS ENUM ('BOOKING', 'PAYMENT', 'EVENT', 'ACCOUNT', 'COUPON', 'REVIEW', 'MESSAGE', 'NOTIFICATION', 'SYSTEM', 'GENERAL', 'SELLER', 'USER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PlatformType" AS ENUM ('WEB', 'ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "public"."WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ChangeFrequency" AS ENUM ('ALWAYS', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'NEVER');

-- CreateEnum
CREATE TYPE "public"."CardType" AS ENUM ('FEATURED', 'TRENDING', 'NEW', 'POPULAR', 'RECOMMENDED');

-- CreateEnum
CREATE TYPE "public"."PointRuleAction" AS ENUM ('BOOKING', 'SIGNUP', 'REFERRAL_SIGNUP', 'REFERRAL_PURCHASE', 'REVIEW_SUBMITTED', 'BIRTHDAY_BONUS', 'MANUAL_ADJUSTMENT', 'LOGIN_STREAK', 'SOCIAL_SHARE');

-- CreateEnum
CREATE TYPE "public"."RewardPointStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'ADJUSTED');

-- CreateTable
CREATE TABLE "public"."users" (
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "about" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "dob" TIMESTAMP(3),
    "governmentID" TEXT,
    "gender" "public"."Gender",
    "lattitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isSellerVerified" BOOLEAN NOT NULL DEFAULT false,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "stripeAccountId" TEXT,
    "stripeAccountStatus" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."user_otp" (
    "id" TEXT NOT NULL,
    "type" "public"."OtpType" NOT NULL DEFAULT 'VERIFY_EMAIL',
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempt" "public"."LoginHistoryStatus" NOT NULL DEFAULT 'SUCCESS',
    "ip" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categorys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "icon" TEXT,
    "parentId" TEXT,
    "status" "public"."CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_interest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "user_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "metaData" JSONB,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'ONGOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seats" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "row" TEXT,
    "number" INTEGER,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL,
    "vat" DECIMAL(65,30) NOT NULL,
    "tax" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "public"."PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "provider" "public"."PaymentProvider" NOT NULL,
    "payerId" TEXT,
    "payeeId" TEXT,
    "bookingId" TEXT,
    "eventId" TEXT,
    "stripePaymentIntent" TEXT,
    "stripeTransferId" TEXT,
    "stripeAccountId" TEXT,
    "stripeChargeId" TEXT,
    "platformFee" DECIMAL(10,2),
    "sellerAmount" DECIMAL(10,2),
    "externalTxnId" TEXT,
    "parentTransactionId" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "payoutStatus" "public"."payoutStatus" NOT NULL DEFAULT 'NULL',

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "reviewId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyed" TEXT,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("reviewId")
);

-- CreateTable
CREATE TABLE "public"."message_rooms" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachment" TEXT,
    "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL DEFAULT 'MESSAGE',
    "title" TEXT NOT NULL,
    "link" TEXT,
    "message" TEXT NOT NULL,
    "image" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_log" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seller_verifications" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "idDocument" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "seller_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_info" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "public"."BusinessInfoStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT,
    "type" TEXT,
    "description" TEXT,
    "registrationNumber" TEXT,
    "taxvatNumber" TEXT,
    "country" TEXT,
    "businessPhone" TEXT,
    "businessEmail" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "socialLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "message" TEXT,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newBooking" BOOLEAN NOT NULL DEFAULT true,
    "bookingcancellation" BOOLEAN NOT NULL DEFAULT true,
    "bookingreminder" BOOLEAN NOT NULL DEFAULT true,
    "payoutintiated" BOOLEAN NOT NULL DEFAULT true,
    "payoutcompleted" BOOLEAN NOT NULL DEFAULT true,
    "newreview" BOOLEAN NOT NULL DEFAULT true,
    "eventupdate" BOOLEAN NOT NULL DEFAULT true,
    "promotionaloffer" BOOLEAN NOT NULL DEFAULT true,
    "loginnewdevice" BOOLEAN NOT NULL DEFAULT true,
    "policychange" BOOLEAN NOT NULL DEFAULT true,
    "securityalert" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "status" "public"."BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "seoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."withdrawal_requests" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "status" "public"."WithdrawalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "stripeTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."helpfaqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "blogId" TEXT,
    "type" "public"."HelpType" NOT NULL DEFAULT 'OTHER',
    "status" "public"."HelpFaqStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "helpfaqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feedback" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "platform" "public"."PlatformType" NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "payload" JSONB,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "public"."CardType" NOT NULL DEFAULT 'FEATURED',

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "siteLogo" TEXT,
    "siteFavicon" TEXT,
    "siteDescription" TEXT,
    "siteKeywords" TEXT,
    "siteEmail" TEXT,
    "sitePhone" TEXT,
    "siteAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contactinformation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "secondaryEmail" TEXT,
    "phone" TEXT NOT NULL,
    "phoneMessage" TEXT,
    "secondaryPhone" TEXT,
    "address" TEXT,
    "secondaryAddress" TEXT,
    "businessHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactinformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badgeTitle" TEXT,
    "designation" TEXT,
    "image" TEXT,
    "title" TEXT,
    "description" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dynamicPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "content" TEXT,
    "seoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamicPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeoMetadata" (
    "id" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogType" TEXT,
    "ogSiteName" TEXT,
    "structuredData" JSONB,
    "changefreq" "public"."ChangeFrequency",
    "priority" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_BlogCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlogCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "public"."users"("name");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE INDEX "users_blockedUntil_idx" ON "public"."users"("blockedUntil");

-- CreateIndex
CREATE INDEX "users_isEmailVerified_idx" ON "public"."users"("isEmailVerified");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "public"."users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_lattitude_idx" ON "public"."users"("lattitude");

-- CreateIndex
CREATE INDEX "users_longitude_idx" ON "public"."users"("longitude");

-- CreateIndex
CREATE INDEX "user_otp_email_idx" ON "public"."user_otp"("email");

-- CreateIndex
CREATE INDEX "user_otp_expiresAt_idx" ON "public"."user_otp"("expiresAt");

-- CreateIndex
CREATE INDEX "user_otp_otp_idx" ON "public"."user_otp"("otp");

-- CreateIndex
CREATE UNIQUE INDEX "user_otp_email_type_key" ON "public"."user_otp"("email", "type");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "public"."accounts"("userId");

-- CreateIndex
CREATE INDEX "accounts_createdAt_idx" ON "public"."accounts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "public"."user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_name_idx" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "public"."role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "public"."login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "public"."login_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "categorys_name_key" ON "public"."categorys"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categorys_slug_key" ON "public"."categorys"("slug");

-- CreateIndex
CREATE INDEX "categorys_name_idx" ON "public"."categorys"("name");

-- CreateIndex
CREATE INDEX "categorys_slug_idx" ON "public"."categorys"("slug");

-- CreateIndex
CREATE INDEX "user_interest_userId_idx" ON "public"."user_interest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_interest_userId_categoryId_key" ON "public"."user_interest"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "events_eventId_key" ON "public"."events"("eventId");

-- CreateIndex
CREATE INDEX "events_eventId_idx" ON "public"."events"("eventId");

-- CreateIndex
CREATE INDEX "seats_eventId_idx" ON "public"."seats"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "seats_seatId_eventId_key" ON "public"."seats"("seatId", "eventId");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "public"."bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "public"."bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "public"."bookings"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "public"."transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "public"."transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_payerId_idx" ON "public"."transactions"("payerId");

-- CreateIndex
CREATE INDEX "transactions_payeeId_idx" ON "public"."transactions"("payeeId");

-- CreateIndex
CREATE INDEX "transactions_bookingId_idx" ON "public"."transactions"("bookingId");

-- CreateIndex
CREATE INDEX "transactions_eventId_idx" ON "public"."transactions"("eventId");

-- CreateIndex
CREATE INDEX "transactions_stripePaymentIntent_idx" ON "public"."transactions"("stripePaymentIntent");

-- CreateIndex
CREATE INDEX "transactions_parentTransactionId_idx" ON "public"."transactions"("parentTransactionId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "public"."transactions"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "public"."reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_eventId_idx" ON "public"."reviews"("eventId");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "public"."reviews"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "public"."reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "message_rooms_createdAt_idx" ON "public"."message_rooms"("createdAt");

-- CreateIndex
CREATE INDEX "message_rooms_bookingId_idx" ON "public"."message_rooms"("bookingId");

-- CreateIndex
CREATE INDEX "message_rooms_receiverId_idx" ON "public"."message_rooms"("receiverId");

-- CreateIndex
CREATE INDEX "message_rooms_senderId_idx" ON "public"."message_rooms"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_rooms_senderId_receiverId_eventId_key" ON "public"."message_rooms"("senderId", "receiverId", "eventId");

-- CreateIndex
CREATE INDEX "messages_isRead_idx" ON "public"."messages"("isRead");

-- CreateIndex
CREATE INDEX "messages_sentAt_idx" ON "public"."messages"("sentAt");

-- CreateIndex
CREATE INDEX "messages_receiverId_idx" ON "public"."messages"("receiverId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "public"."messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_roomId_idx" ON "public"."messages"("roomId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_userId_idx" ON "public"."notifications"("createdAt", "userId");

-- CreateIndex
CREATE INDEX "notifications_readAt_idx" ON "public"."notifications"("readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "activity_log_createdAt_idx" ON "public"."activity_log"("createdAt");

-- CreateIndex
CREATE INDEX "activity_log_userId_idx" ON "public"."activity_log"("userId");

-- CreateIndex
CREATE INDEX "seller_verifications_verified_idx" ON "public"."seller_verifications"("verified");

-- CreateIndex
CREATE INDEX "seller_verifications_verifiedAt_idx" ON "public"."seller_verifications"("verifiedAt");

-- CreateIndex
CREATE INDEX "seller_verifications_sellerId_idx" ON "public"."seller_verifications"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "business_info_sellerId_key" ON "public"."business_info"("sellerId");

-- CreateIndex
CREATE INDEX "business_info_verifiedAt_idx" ON "public"."business_info"("verifiedAt");

-- CreateIndex
CREATE INDEX "business_info_sellerId_idx" ON "public"."business_info"("sellerId");

-- CreateIndex
CREATE INDEX "business_info_createdAt_idx" ON "public"."business_info"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_settings_userId_key" ON "public"."notifications_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_settings_userId_idx" ON "public"."notifications_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_slug_key" ON "public"."blog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_seoId_key" ON "public"."blog"("seoId");

-- CreateIndex
CREATE INDEX "blog_isFeatured_idx" ON "public"."blog"("isFeatured");

-- CreateIndex
CREATE INDEX "blog_isDeleted_idx" ON "public"."blog"("isDeleted");

-- CreateIndex
CREATE INDEX "blog_status_idx" ON "public"."blog"("status");

-- CreateIndex
CREATE INDEX "blog_slug_idx" ON "public"."blog"("slug");

-- CreateIndex
CREATE INDEX "blog_authorId_idx" ON "public"."blog"("authorId");

-- CreateIndex
CREATE INDEX "blog_publishedAt_idx" ON "public"."blog"("publishedAt");

-- CreateIndex
CREATE INDEX "blog_createdAt_idx" ON "public"."blog"("createdAt");

-- CreateIndex
CREATE INDEX "withdrawal_requests_sellerId_idx" ON "public"."withdrawal_requests"("sellerId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "public"."withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_requestedAt_idx" ON "public"."withdrawal_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "withdrawal_requests_createdAt_idx" ON "public"."withdrawal_requests"("createdAt");

-- CreateIndex
CREATE INDEX "helpfaqs_status_idx" ON "public"."helpfaqs"("status");

-- CreateIndex
CREATE INDEX "helpfaqs_createdAt_idx" ON "public"."helpfaqs"("createdAt");

-- CreateIndex
CREATE INDEX "helpfaqs_updatedAt_idx" ON "public"."helpfaqs"("updatedAt");

-- CreateIndex
CREATE INDEX "helpfaqs_question_idx" ON "public"."helpfaqs"("question");

-- CreateIndex
CREATE INDEX "helpfaqs_answer_idx" ON "public"."helpfaqs"("answer");

-- CreateIndex
CREATE INDEX "helpfaqs_type_idx" ON "public"."helpfaqs"("type");

-- CreateIndex
CREATE INDEX "helpfaqs_deletedAt_idx" ON "public"."helpfaqs"("deletedAt");

-- CreateIndex
CREATE INDEX "feedback_userId_idx" ON "public"."feedback"("userId");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "public"."feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "public"."WebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "public"."WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_firstSeenAt_idx" ON "public"."WebhookEvent"("firstSeenAt");

-- CreateIndex
CREATE INDEX "hero_section_createdAt_idx" ON "public"."hero_section"("createdAt");

-- CreateIndex
CREATE INDEX "hero_section_updatedAt_idx" ON "public"."hero_section"("updatedAt");

-- CreateIndex
CREATE INDEX "banner_isActive_idx" ON "public"."banner"("isActive");

-- CreateIndex
CREATE INDEX "banner_createdAt_idx" ON "public"."banner"("createdAt");

-- CreateIndex
CREATE INDEX "banner_updatedAt_idx" ON "public"."banner"("updatedAt");

-- CreateIndex
CREATE INDEX "card_isActive_idx" ON "public"."card"("isActive");

-- CreateIndex
CREATE INDEX "card_createdAt_idx" ON "public"."card"("createdAt");

-- CreateIndex
CREATE INDEX "card_updatedAt_idx" ON "public"."card"("updatedAt");

-- CreateIndex
CREATE INDEX "settings_createdAt_idx" ON "public"."settings"("createdAt");

-- CreateIndex
CREATE INDEX "settings_updatedAt_idx" ON "public"."settings"("updatedAt");

-- CreateIndex
CREATE INDEX "testimonial_isActive_idx" ON "public"."testimonial"("isActive");

-- CreateIndex
CREATE INDEX "testimonial_createdAt_idx" ON "public"."testimonial"("createdAt");

-- CreateIndex
CREATE INDEX "testimonial_updatedAt_idx" ON "public"."testimonial"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "dynamicPage_slug_key" ON "public"."dynamicPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "dynamicPage_seoId_key" ON "public"."dynamicPage"("seoId");

-- CreateIndex
CREATE INDEX "dynamicPage_createdAt_idx" ON "public"."dynamicPage"("createdAt");

-- CreateIndex
CREATE INDEX "dynamicPage_updatedAt_idx" ON "public"."dynamicPage"("updatedAt");

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

-- CreateIndex
CREATE INDEX "wishlist_items_userId_idx" ON "public"."wishlist_items"("userId");

-- CreateIndex
CREATE INDEX "wishlist_items_eventId_idx" ON "public"."wishlist_items"("eventId");

-- CreateIndex
CREATE INDEX "wishlist_items_createdAt_idx" ON "public"."wishlist_items"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_eventId_key" ON "public"."wishlist_items"("userId", "eventId");

-- CreateIndex
CREATE INDEX "_BlogCategories_B_index" ON "public"."_BlogCategories"("B");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categorys" ADD CONSTRAINT "categorys_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."categorys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_interest" ADD CONSTRAINT "user_interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_interest" ADD CONSTRAINT "user_interest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categorys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categorys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seats" ADD CONSTRAINT "seats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("bookingId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("bookingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."message_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seller_verifications" ADD CONSTRAINT "seller_verifications_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_info" ADD CONSTRAINT "business_info_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications_settings" ADD CONSTRAINT "notifications_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog" ADD CONSTRAINT "blog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog" ADD CONSTRAINT "blog_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."helpfaqs" ADD CONSTRAINT "helpfaqs_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "public"."blog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dynamicPage" ADD CONSTRAINT "dynamicPage_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES "public"."SeoMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "public"."wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wishlist_items" ADD CONSTRAINT "wishlist_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlogCategories" ADD CONSTRAINT "_BlogCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlogCategories" ADD CONSTRAINT "_BlogCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."categorys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
