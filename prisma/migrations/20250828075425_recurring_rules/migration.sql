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
CREATE TYPE "public"."Frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."DayType" AS ENUM ('MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('SCHEDULE', 'COMPLETED', 'CANCELLED', 'RESCHEDULE');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "public"."ScheduleType" AS ENUM ('ONTIME', 'RECURRING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ExperienceStatus" AS ENUM ('PUBLISHED', 'ANOUNCEMENT', 'DRAFT', 'PENDING', 'PAUSED', 'CANCELLED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('STRIPE', 'STRIPE_CONNECT', 'BKASH', 'NAGAD', 'ROCKET', 'MANUAL', 'CASH', 'WALLET');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('BOOKING_PAYMENT', 'COUPON_PURCHASE', 'HOST_PAYOUT', 'ADMIN_COMMISSION', 'BOOKING_REFUND', 'COUPON_REFUND', 'MANUAL_DEPOSIT', 'MANUAL_WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('STRIPE', 'BKASH', 'NAGAD', 'ROCKET', 'MANUAL', 'CASH', 'WALLET');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."CouponStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('PREPAID_VALUE', 'SPECIFIC_DEAL', 'BONUS_INCENTIVE');

-- CreateEnum
CREATE TYPE "public"."MediaStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'REELS');

-- CreateEnum
CREATE TYPE "public"."LanguageCode" AS ENUM ('en', 'bn', 'es', 'fr');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('NOTIFY', 'BOOKING', 'REVIEW', 'MESSAGE', 'WISHLIST', 'COUPON', 'EVENT', 'EXPERIENCE', 'PAYMENT', 'SYSTEM', 'ALERT');

-- CreateEnum
CREATE TYPE "public"."BusinessInfoStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."WithdrawalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."HelpFaqStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."HelpType" AS ENUM ('BOOKING', 'PAYMENT', 'EVENT', 'EXPERIENCE', 'ACCOUNT', 'COUPON', 'REVIEW', 'MESSAGE', 'NOTIFICATION', 'SYSTEM', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReelPlatform" AS ENUM ('YOUTUBE', 'TIKTOK', 'FACEBOOK');

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
    "hostVerified" BOOLEAN NOT NULL DEFAULT false,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "stripeAccountId" TEXT,
    "stripeAccountStatus" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,

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
CREATE TABLE "public"."tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categorys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "icon" TEXT,
    "status" "public"."CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
CREATE TABLE "public"."experiences" (
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDesc" TEXT NOT NULL DEFAULT '',
    "slug" VARCHAR(255) NOT NULL,
    "status" "public"."ExperienceStatus" NOT NULL DEFAULT 'DRAFT',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scheduleType" "public"."ScheduleType" NOT NULL DEFAULT 'ONTIME',
    "cancelPolicy" TEXT,
    "latePolicy" TEXT,
    "reschedulePolicy" TEXT,
    "refundable" BOOLEAN NOT NULL DEFAULT false,
    "coverImage" TEXT,
    "cancellationFee" DECIMAL(65,30),
    "detailsDesc" TEXT,
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "guestRequirements" TEXT,
    "agreement" TEXT,
    "averageRating" DOUBLE PRECISION DEFAULT 0.0,
    "reviewCount" INTEGER DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "activities" JSONB,
    "timeslots" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "availableAt" TEXT,
    "availableEndAt" TEXT,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "maxGuest" INTEGER,
    "maxPerSlot" INTEGER,
    "maxparticipants" INTEGER,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("experienceId")
);

-- CreateTable
CREATE TABLE "public"."RecurrenceRule" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "frequency" "public"."Frequency" NOT NULL DEFAULT 'DAILY',
    "interval" INTEGER DEFAULT 1,
    "byday" "public"."DayType"[],
    "count" INTEGER,
    "until" TIMESTAMP(3),
    "nextRecurrence" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurrenceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "title" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "maxGuest" INTEGER NOT NULL,
    "maxperSlot" INTEGER,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "notes" TEXT,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'SCHEDULE',
    "activities" JSONB,
    "timeslots" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxparticipants" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3),
    "availableEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."experience_badges" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,

    CONSTRAINT "experience_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "experienceId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL,
    "vat" DECIMAL(65,30) NOT NULL,
    "tax" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "couponId" TEXT,
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
    "couponId" TEXT,
    "experienceId" TEXT,
    "stripePaymentIntent" TEXT,
    "stripeTransferId" TEXT,
    "stripeAccountId" TEXT,
    "stripeChargeId" TEXT,
    "platformFee" DECIMAL(10,2),
    "hostAmount" DECIMAL(10,2),
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

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "reviewId" TEXT NOT NULL,
    "eventId" TEXT,
    "experienceId" TEXT NOT NULL,
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
CREATE TABLE "public"."coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qrCode" TEXT,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "type" "public"."CouponType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "discountPercent" INTEGER,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purchaseTransactionId" TEXT,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountUsed" DOUBLE PRECISION,
    "notes" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "public"."experience_amenities" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "experience_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."images" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "status" "public"."MediaStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "type" "public"."MediaType" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."translations" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "languageCode" "public"."LanguageCode" NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_rooms" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
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
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."host_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idDocument" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "host_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_info" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
    "experienceupdated" BOOLEAN NOT NULL DEFAULT true,
    "tipsforhost" BOOLEAN NOT NULL DEFAULT true,
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
    "publishedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "seoTitle" VARCHAR(70),
    "seoDescription" VARCHAR(160),
    "ogImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."withdrawal_requests" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
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
CREATE TABLE "public"."reels" (
    "id" TEXT NOT NULL,
    "platform" "public"."ReelPlatform" NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ExperienceTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExperienceTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_BlogTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlogTags_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE UNIQUE INDEX "tags_name_key" ON "public"."tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "public"."tags"("slug");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "public"."tags"("name");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "public"."tags"("slug");

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
CREATE UNIQUE INDEX "experiences_slug_key" ON "public"."experiences"("slug");

-- CreateIndex
CREATE INDEX "experiences_name_idx" ON "public"."experiences"("name");

-- CreateIndex
CREATE INDEX "experiences_latitude_idx" ON "public"."experiences"("latitude");

-- CreateIndex
CREATE INDEX "experiences_longitude_idx" ON "public"."experiences"("longitude");

-- CreateIndex
CREATE INDEX "experiences_slug_idx" ON "public"."experiences"("slug");

-- CreateIndex
CREATE INDEX "experiences_startDate_idx" ON "public"."experiences"("startDate");

-- CreateIndex
CREATE INDEX "experiences_deletedAt_idx" ON "public"."experiences"("deletedAt");

-- CreateIndex
CREATE INDEX "experiences_userId_idx" ON "public"."experiences"("userId");

-- CreateIndex
CREATE INDEX "experiences_status_idx" ON "public"."experiences"("status");

-- CreateIndex
CREATE INDEX "experiences_createdAt_idx" ON "public"."experiences"("createdAt");

-- CreateIndex
CREATE INDEX "experiences_city_idx" ON "public"."experiences"("city");

-- CreateIndex
CREATE INDEX "experiences_country_idx" ON "public"."experiences"("country");

-- CreateIndex
CREATE INDEX "experiences_categoryId_idx" ON "public"."experiences"("categoryId");

-- CreateIndex
CREATE INDEX "experiences_isActive_idx" ON "public"."experiences"("isActive");

-- CreateIndex
CREATE INDEX "experiences_availableAt_idx" ON "public"."experiences"("availableAt");

-- CreateIndex
CREATE INDEX "experiences_availableEndAt_idx" ON "public"."experiences"("availableEndAt");

-- CreateIndex
CREATE INDEX "experiences_isRecurring_idx" ON "public"."experiences"("isRecurring");

-- CreateIndex
CREATE UNIQUE INDEX "RecurrenceRule_experienceId_key" ON "public"."RecurrenceRule"("experienceId");

-- CreateIndex
CREATE INDEX "events_maxparticipants_idx" ON "public"."events"("maxparticipants");

-- CreateIndex
CREATE INDEX "events_availableAt_idx" ON "public"."events"("availableAt");

-- CreateIndex
CREATE INDEX "events_availableEndAt_idx" ON "public"."events"("availableEndAt");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "public"."events"("date");

-- CreateIndex
CREATE INDEX "events_experienceId_idx" ON "public"."events"("experienceId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "public"."events"("status");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "public"."events"("createdAt");

-- CreateIndex
CREATE INDEX "events_isAvailable_idx" ON "public"."events"("isAvailable");

-- CreateIndex
CREATE INDEX "events_startTime_idx" ON "public"."events"("startTime");

-- CreateIndex
CREATE INDEX "events_title_idx" ON "public"."events"("title");

-- CreateIndex
CREATE INDEX "events_price_idx" ON "public"."events"("price");

-- CreateIndex
CREATE UNIQUE INDEX "events_experienceId_date_startTime_key" ON "public"."events"("experienceId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "public"."badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "experience_badges_experienceId_badgeId_key" ON "public"."experience_badges"("experienceId", "badgeId");

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
CREATE INDEX "transactions_couponId_idx" ON "public"."transactions"("couponId");

-- CreateIndex
CREATE INDEX "transactions_experienceId_idx" ON "public"."transactions"("experienceId");

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
CREATE UNIQUE INDEX "coupons_code_key" ON "public"."coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_qrCode_key" ON "public"."coupons"("qrCode");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "public"."coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_experienceId_idx" ON "public"."coupons"("experienceId");

-- CreateIndex
CREATE INDEX "coupons_userId_idx" ON "public"."coupons"("userId");

-- CreateIndex
CREATE INDEX "coupons_validFrom_validTo_idx" ON "public"."coupons"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "coupons_userId_status_idx" ON "public"."coupons"("userId", "status");

-- CreateIndex
CREATE INDEX "coupons_experienceId_status_idx" ON "public"."coupons"("experienceId", "status");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_idx" ON "public"."coupon_redemptions"("couponId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_customerId_idx" ON "public"."coupon_redemptions"("customerId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_experienceId_idx" ON "public"."coupon_redemptions"("experienceId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_hostId_idx" ON "public"."coupon_redemptions"("hostId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_redeemedAt_idx" ON "public"."coupon_redemptions"("redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_slug_key" ON "public"."amenities"("slug");

-- CreateIndex
CREATE INDEX "amenities_createdAt_idx" ON "public"."amenities"("createdAt");

-- CreateIndex
CREATE INDEX "amenities_name_idx" ON "public"."amenities"("name");

-- CreateIndex
CREATE INDEX "amenities_slug_idx" ON "public"."amenities"("slug");

-- CreateIndex
CREATE INDEX "experience_amenities_amenityId_idx" ON "public"."experience_amenities"("amenityId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_amenities_experienceId_amenityId_key" ON "public"."experience_amenities"("experienceId", "amenityId");

-- CreateIndex
CREATE INDEX "images_uploadedAt_idx" ON "public"."images"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "translations_experienceId_languageCode_key" ON "public"."translations"("experienceId", "languageCode");

-- CreateIndex
CREATE INDEX "message_rooms_createdAt_idx" ON "public"."message_rooms"("createdAt");

-- CreateIndex
CREATE INDEX "message_rooms_bookingId_idx" ON "public"."message_rooms"("bookingId");

-- CreateIndex
CREATE INDEX "message_rooms_receiverId_idx" ON "public"."message_rooms"("receiverId");

-- CreateIndex
CREATE INDEX "message_rooms_senderId_idx" ON "public"."message_rooms"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_rooms_senderId_receiverId_experienceId_key" ON "public"."message_rooms"("senderId", "receiverId", "experienceId");

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
CREATE INDEX "wishlist_items_userId_idx" ON "public"."wishlist_items"("userId");

-- CreateIndex
CREATE INDEX "wishlist_items_experienceId_idx" ON "public"."wishlist_items"("experienceId");

-- CreateIndex
CREATE INDEX "wishlist_items_createdAt_idx" ON "public"."wishlist_items"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_experienceId_key" ON "public"."wishlist_items"("userId", "experienceId");

-- CreateIndex
CREATE INDEX "host_verifications_verified_idx" ON "public"."host_verifications"("verified");

-- CreateIndex
CREATE INDEX "host_verifications_verifiedAt_idx" ON "public"."host_verifications"("verifiedAt");

-- CreateIndex
CREATE INDEX "host_verifications_userId_idx" ON "public"."host_verifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_info_userId_key" ON "public"."business_info"("userId");

-- CreateIndex
CREATE INDEX "business_info_verifiedAt_idx" ON "public"."business_info"("verifiedAt");

-- CreateIndex
CREATE INDEX "business_info_userId_idx" ON "public"."business_info"("userId");

-- CreateIndex
CREATE INDEX "business_info_createdAt_idx" ON "public"."business_info"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_settings_userId_key" ON "public"."notifications_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_settings_userId_idx" ON "public"."notifications_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_slug_key" ON "public"."blog"("slug");

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
CREATE INDEX "withdrawal_requests_hostId_idx" ON "public"."withdrawal_requests"("hostId");

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
CREATE INDEX "reels_platform_idx" ON "public"."reels"("platform");

-- CreateIndex
CREATE INDEX "reels_isActive_idx" ON "public"."reels"("isActive");

-- CreateIndex
CREATE INDEX "reels_experienceId_idx" ON "public"."reels"("experienceId");

-- CreateIndex
CREATE INDEX "reels_createdById_idx" ON "public"."reels"("createdById");

-- CreateIndex
CREATE INDEX "reels_createdAt_idx" ON "public"."reels"("createdAt");

-- CreateIndex
CREATE INDEX "reels_updatedAt_idx" ON "public"."reels"("updatedAt");

-- CreateIndex
CREATE INDEX "reels_deletedAt_idx" ON "public"."reels"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "reels_platform_videoId_key" ON "public"."reels"("platform", "videoId");

-- CreateIndex
CREATE INDEX "_ExperienceTags_B_index" ON "public"."_ExperienceTags"("B");

-- CreateIndex
CREATE INDEX "_BlogTags_B_index" ON "public"."_BlogTags"("B");

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
ALTER TABLE "public"."user_interest" ADD CONSTRAINT "user_interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_interest" ADD CONSTRAINT "user_interest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categorys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experiences_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categorys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurrenceRule" ADD CONSTRAINT "RecurrenceRule_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experience_badges" ADD CONSTRAINT "experience_badges_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experience_badges" ADD CONSTRAINT "experience_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "public"."badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("bookingId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupons" ADD CONSTRAINT "coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupons" ADD CONSTRAINT "coupons_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupons" ADD CONSTRAINT "coupons_purchaseTransactionId_fkey" FOREIGN KEY ("purchaseTransactionId") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experience_amenities" ADD CONSTRAINT "experience_amenities_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."experience_amenities" ADD CONSTRAINT "experience_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "public"."amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."translations" ADD CONSTRAINT "translations_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_rooms" ADD CONSTRAINT "message_rooms_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "public"."activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wishlist_items" ADD CONSTRAINT "wishlist_items_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."host_verifications" ADD CONSTRAINT "host_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_info" ADD CONSTRAINT "business_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications_settings" ADD CONSTRAINT "notifications_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog" ADD CONSTRAINT "blog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."helpfaqs" ADD CONSTRAINT "helpfaqs_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "public"."blog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reels" ADD CONSTRAINT "reels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reels" ADD CONSTRAINT "reels_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."experiences"("experienceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ExperienceTags" ADD CONSTRAINT "_ExperienceTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."experiences"("experienceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ExperienceTags" ADD CONSTRAINT "_ExperienceTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlogTags" ADD CONSTRAINT "_BlogTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlogTags" ADD CONSTRAINT "_BlogTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlogCategories" ADD CONSTRAINT "_BlogCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlogCategories" ADD CONSTRAINT "_BlogCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."categorys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
