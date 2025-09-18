import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { AuditService } from '../common/services/audit.service';
import { DistributedLockService } from '../common/services/distributed-lock.service';
import { TransactionService } from '../transaction/transaction.service';
import {
  CouponType,
  CouponStatus,
  TransactionType,
  Currency,
  PaymentProvider,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export interface CreateCouponDto {
  experienceId: string;
  type: CouponType;
  title: string;
  description: string;
  value: number;
  currency?: Currency;
  discountPercent?: number;
  maxUses?: number;
  validFrom: Date;
  validTo: Date;
}

export interface RedeemCouponDto {
  couponCode: string;
  experienceId: string;
  customerId: string;
  hostId: string;
  amountUsed?: number;
  notes?: string;
  ipAddress?: string;
  location?: string;
}

@Injectable()
export class CouponOptimizedService {
  private readonly logger = new Logger(CouponOptimizedService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private auditService: AuditService,
    private lockService: DistributedLockService,
    private transactionService: TransactionService,
  ) {}

  /**
   * Create coupon with QR code generation and validation
   */
  async createCoupon(
    userId: string,
    data: CreateCouponDto,
    transactionId?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Validate experience ownership
      const experience = await tx.experience.findUnique({
        where: { id: data.experienceId },
        select: { id: true, userId: true, name: true, status: true },
      });

      if (!experience) {
        throw new NotFoundException('Experience not found');
      }

      // Validate business rules
      this.validateCouponData(data);

      // Generate unique coupon code and QR code
      const code = await this.generateUniqueCouponCode();
      const qrCodeData = await this.generateQRCode(code, data.experienceId);

      const coupon = await tx.coupon.create({
        data: {
          code,
          qrCode: qrCodeData,
          userId,
          experienceId: data.experienceId,
          type: data.type,
          title: data.title,
          description: data.description,
          value: data.value,
          currency: data.currency || Currency.USD,
          discountPercent: data.discountPercent,
          maxUses: data.maxUses || 1,
          validFrom: data.validFrom,
          validTo: data.validTo,
          status: CouponStatus.ACTIVE,
          purchaseTransactionId: transactionId,
        },
        include: {
          experience: {
            select: { id: true, name: true, coverImage: true },
          },
        },
      });

      // Invalidate relevant caches
      await this.cacheService.invalidatePattern(`user:${userId}:coupons`);
      await this.cacheService.invalidatePattern(
        `experience:${data.experienceId}:coupons`,
      );

      // Audit log
      await this.auditService.log({
        userId,
        action: 'CREATE',
        resource: 'COUPON',
        resourceId: coupon.id,
        metadata: {
          experienceId: data.experienceId,
          type: data.type,
          value: data.value,
        },
      });

      this.logger.log(`Coupon created: ${coupon.id} for user ${userId}`);

      return {
        success: true,
        data: coupon,
        message: 'Coupon created successfully',
      };
    });
  }

  /**
   * Redeem coupon with fraud prevention and atomic operations
   */
  async redeemCoupon(data: RedeemCouponDto): Promise<any> {
    const lockKey = `coupon:redeem:${data.couponCode}`;

    return this.lockService.withLock(lockKey, async () => {
      return this.prisma.$transaction(
        async (tx) => {
          // Get coupon with all validations
          const coupon = await tx.coupon.findUnique({
            where: { code: data.couponCode },
            include: {
              user: { select: { id: true, name: true } },
              experience: {
                select: {
                  id: true,
                  name: true,
                  userId: true,
                  status: true,
                },
              },
              redemptions: {
                select: { id: true, amountUsed: true },
              },
            },
          });

          if (!coupon) {
            throw new NotFoundException('Coupon not found');
          }

          // Comprehensive validation
          await this.validateCouponRedemption(coupon, data);

          // Calculate redemption amount
          const amountToRedeem = data.amountUsed || coupon.value;
          const totalRedeemed = coupon.redemptions.reduce(
            (sum, r) => sum + (r.amountUsed || 0),
            0,
          );

          if (totalRedeemed + amountToRedeem > coupon.value) {
            throw new BadRequestException('Insufficient coupon value');
          }

          // Create redemption record
          const redemption = await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              customerId: data.customerId,
              experienceId: data.experienceId,
              hostId: data.hostId,
              amountUsed: amountToRedeem,
              notes: data.notes,
              ipAddress: data.ipAddress,
              location: data.location,
            },
          });

          // Update coupon status
          const newUsedCount = coupon.usedCount + 1;
          const isFullyUsed =
            newUsedCount >= coupon.maxUses ||
            totalRedeemed + amountToRedeem >= coupon.value;

          await tx.coupon.update({
            where: { id: coupon.id },
            data: {
              usedCount: newUsedCount,
              status: isFullyUsed ? CouponStatus.USED : CouponStatus.ACTIVE,
            },
          });

          // Invalidate caches
          await this.cacheService.invalidatePattern(`coupon:${coupon.code}:*`);
          await this.cacheService.invalidatePattern(
            `user:${coupon.userId}:coupons`,
          );

          // Audit log
          await this.auditService.log({
            userId: data.hostId,
            action: 'REDEEM',
            resource: 'COUPON',
            resourceId: coupon.id,
            metadata: {
              customerId: data.customerId,
              amountUsed: amountToRedeem,
              ipAddress: data.ipAddress,
              location: data.location,
            },
            ipAddress: data.ipAddress,
          });

          this.logger.log(
            `Coupon redeemed: ${coupon.code} - Amount: ${amountToRedeem} - Customer: ${data.customerId}`,
          );

          return {
            success: true,
            data: {
              redemption,
              coupon: {
                id: coupon.id,
                code: coupon.code,
                remainingValue: coupon.value - (totalRedeemed + amountToRedeem),
                status: isFullyUsed ? CouponStatus.USED : CouponStatus.ACTIVE,
              },
            },
            message: 'Coupon redeemed successfully',
          };
        },
        {
          timeout: 15000,
          isolationLevel: 'Serializable',
        },
      );
    });
  }

  /**
   * Get user coupons with filtering and caching
   */
  async getUserCoupons(
    userId: string,
    options: {
      status?: CouponStatus;
      experienceId?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<any> {
    const { status, experienceId, page = 1, limit = 20 } = options;
    const cacheKey = `user:${userId}:coupons:${status || 'all'}:${experienceId || 'all'}:${page}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        const where: any = { userId };

        if (status) where.status = status;
        if (experienceId) where.experienceId = experienceId;

        // Auto-expire coupons
        await this.autoExpireCoupons();

        const [coupons, total] = await this.prisma.$transaction([
          this.prisma.coupon.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              experience: {
                select: {
                  id: true,
                  name: true,
                  coverImage: true,
                  user: { select: { id: true, name: true } },
                },
              },
              redemptions: {
                select: {
                  id: true,
                  amountUsed: true,
                  redeemedAt: true,
                },
              },
              _count: {
                select: { redemptions: true },
              },
            },
          }),
          this.prisma.coupon.count({ where }),
        ]);

        return {
          success: true,
          data: coupons.map((coupon) => ({
            ...coupon,
            remainingValue:
              coupon.value -
              coupon.redemptions.reduce(
                (sum, r) => sum + (r.amountUsed || 0),
                0,
              ),
            remainingUses: coupon.maxUses - coupon.usedCount,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: skip + limit < total,
            hasPrev: page > 1,
          },
        };
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Validate coupon for redemption
   */
  async validateCoupon(couponCode: string, experienceId: string): Promise<any> {
    const cacheKey = `coupon:${couponCode}:validation`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const coupon = await this.prisma.coupon.findUnique({
          where: { code: couponCode },
          include: {
            experience: { select: { id: true, name: true, status: true } },
            redemptions: { select: { amountUsed: true } },
          },
        });

        if (!coupon) {
          return { valid: false, reason: 'Coupon not found' };
        }

        // Validate coupon
        const validation = this.performCouponValidation(coupon, experienceId);

        return {
          valid: validation.valid,
          reason: validation.reason,
          coupon: validation.valid
            ? {
                id: coupon.id,
                title: coupon.title,
                value: coupon.value,
                remainingValue:
                  coupon.value -
                  coupon.redemptions.reduce(
                    (sum, r) => sum + (r.amountUsed || 0),
                    0,
                  ),
                type: coupon.type,
                experienceName: coupon.experience.name,
              }
            : null,
        };
      },
      60, // 1 minute cache
    );
  }

  /**
   * Auto-expire coupons based on validity period
   */
  private async autoExpireCoupons(): Promise<void> {
    try {
      const now = new Date();
      const expiredCount = await this.prisma.coupon.updateMany({
        where: {
          status: CouponStatus.ACTIVE,
          validTo: { lt: now },
        },
        data: {
          status: CouponStatus.EXPIRED,
        },
      });

      if (expiredCount.count > 0) {
        this.logger.log(`Auto-expired ${expiredCount.count} coupons`);
      }
    } catch (error) {
      this.logger.error('Failed to auto-expire coupons', error);
    }
  }

  /**
   * Generate unique coupon code
   */
  private async generateUniqueCouponCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateCouponCode();

      const existing = await this.prisma.coupon.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new InternalServerErrorException(
      'Failed to generate unique coupon code',
    );
  }

  /**
   * Generate coupon code format: WEOUT-XXXX-XXXX
   */
  private generateCouponCode(): string {
    const randomPart = randomBytes(4).toString('hex').toUpperCase();
    return `WEOUT-${randomPart.slice(0, 4)}-${randomPart.slice(4, 8)}`;
  }

  /**
   * Generate QR code for coupon
   */
  private async generateQRCode(
    code: string,
    experienceId: string,
  ): Promise<string> {
    const qrData = {
      code,
      experienceId,
      timestamp: Date.now(),
      platform: 'weout',
    };

    return await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }

  /**
   * Validate coupon data
   */
  private validateCouponData(data: CreateCouponDto): void {
    if (data.value <= 0) {
      throw new BadRequestException('Coupon value must be positive');
    }

    if (data.validFrom >= data.validTo) {
      throw new BadRequestException('Invalid validity period');
    }

    if (data.validTo <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }

    if (data.maxUses && data.maxUses <= 0) {
      throw new BadRequestException('Max uses must be positive');
    }

    if (
      data.discountPercent &&
      (data.discountPercent < 0 || data.discountPercent > 100)
    ) {
      throw new BadRequestException('Discount percent must be between 0-100');
    }
  }

  /**
   * Perform basic coupon validation for validation endpoint
   */
  private performCouponValidation(
    coupon: any,
    experienceId: string,
  ): { valid: boolean; reason?: string } {
    const now = new Date();

    if (coupon.status !== CouponStatus.ACTIVE) {
      return {
        valid: false,
        reason: `Coupon is ${coupon.status.toLowerCase()}`,
      };
    }

    if (now < coupon.validFrom) {
      return { valid: false, reason: 'Coupon not yet valid' };
    }

    if (now > coupon.validTo) {
      return { valid: false, reason: 'Coupon has expired' };
    }

    if (coupon.experienceId !== experienceId) {
      return { valid: false, reason: 'Coupon not valid for this experience' };
    }

    if (coupon.experience.status !== 'PUBLISHED') {
      return { valid: false, reason: 'Experience not available' };
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: 'Coupon usage limit exceeded' };
    }

    const totalRedeemed = coupon.redemptions.reduce(
      (sum: number, r: any) => sum + (r.amountUsed || 0),
      0,
    );

    if (totalRedeemed >= coupon.value) {
      return { valid: false, reason: 'Coupon value fully redeemed' };
    }

    return { valid: true };
  }

  /**
   * Validate coupon redemption
   */
  private validateCouponRedemption(
    coupon: any,
    data: RedeemCouponDto,
  ): { valid: boolean; reason?: string } {
    const now = new Date();

    if (coupon.status !== CouponStatus.ACTIVE) {
      return {
        valid: false,
        reason: `Coupon is ${coupon.status.toLowerCase()}`,
      };
    }

    if (now < coupon.validFrom) {
      return { valid: false, reason: 'Coupon not yet valid' };
    }

    if (now > coupon.validTo) {
      return { valid: false, reason: 'Coupon has expired' };
    }

    if (coupon.experienceId !== data.experienceId) {
      return { valid: false, reason: 'Coupon not valid for this experience' };
    }

    if (coupon.experience.status !== 'PUBLISHED') {
      return { valid: false, reason: 'Experience not available' };
    }

    if (coupon.experience.userId !== data.hostId) {
      return { valid: false, reason: 'Invalid host for this experience' };
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: 'Coupon usage limit exceeded' };
    }

    const totalRedeemed = coupon.redemptions.reduce(
      (sum: number, r: any) => sum + (r.amountUsed || 0),
      0,
    );

    if (totalRedeemed >= coupon.value) {
      return { valid: false, reason: 'Coupon value fully redeemed' };
    }

    return { valid: true };
  }

  /**
   * Get coupon analytics for experience owners
   */
  async getCouponAnalytics(experienceId: string, hostId: string): Promise<any> {
    // Validate ownership
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      select: { userId: true },
    });

    if (!experience || experience.userId !== hostId) {
      throw new ForbiddenException('Access denied');
    }

    const cacheKey = `experience:${experienceId}:coupon:analytics`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [
          totalCoupons,
          activeCoupons,
          redeemedCoupons,
          totalRedemptions,
          revenueFromCoupons,
        ] = await this.prisma.$transaction([
          this.prisma.coupon.count({
            where: { experienceId },
          }),
          this.prisma.coupon.count({
            where: { experienceId, status: CouponStatus.ACTIVE },
          }),
          this.prisma.coupon.count({
            where: { experienceId, status: CouponStatus.USED },
          }),
          this.prisma.couponRedemption.count({
            where: { experienceId },
          }),
          this.prisma.couponRedemption.aggregate({
            where: { experienceId },
            _sum: { amountUsed: true },
          }),
        ]);

        return {
          totalCoupons,
          activeCoupons,
          redeemedCoupons,
          expiredCoupons: totalCoupons - activeCoupons - redeemedCoupons,
          totalRedemptions,
          totalRevenue: revenueFromCoupons._sum.amountUsed || 0,
          redemptionRate:
            totalCoupons > 0 ? (redeemedCoupons / totalCoupons) * 100 : 0,
        };
      },
      1800, // 30 minutes cache
    );
  }
}
