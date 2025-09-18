// import {
//   Injectable,
//   BadRequestException,
//   NotFoundException,
//   ForbiddenException,
// } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { CouponType, CouponStatus, Currency, Prisma } from '@prisma/client';
// import { Decimal } from '@prisma/client/runtime/library';
// // import * as QRCode from 'qrcode'; // TODO: Install qrcode package
// import { randomBytes } from 'crypto';
// import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.schemas';
// import { couponQuerySchema } from './dto/query.dto';

// // ============= DTOs =============

// export interface CouponFilters {
//   userId?: string;
//   experienceId?: string;
//   type?: CouponType;
//   status?: CouponStatus;
//   isActive?: boolean;
//   validFrom?: Date;
//   validTo?: Date;
//   search?: string; // Search in title/description
// }

// export interface PaginationOptions {
//   page?: number;
//   limit?: number;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
// }

// export interface RedeemCouponDto {
//   couponCode: string;
//   experienceId: string;
//   hostId: string;
//   amountUsed?: number;
//   notes?: string;
//   ipAddress?: string;
//   location?: string;
// }

// export interface CouponAnalytics {
//   totalCoupons: number;
//   activeCoupons: number;
//   usedCoupons: number;
//   expiredCoupons: number;
//   totalValue: number;
//   redeemedValue: number;
//   redemptionRate: number;
//   byType: Record<string, { count: number; value: number }>;
//   byStatus: Record<string, { count: number; value: number }>;
//   recentRedemptions: any[];
// }

// @Injectable()
// export class CouponService {
//   constructor(private prisma: PrismaService) {}

//   // ============= CORE COUPON OPERATIONS =============

//   async createCoupon(userId: string, data: CreateCouponDto) {
//     const experience = await this.prisma.experience.findUnique({
//       where: { id: data.experienceId },
//       include: { user: true },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found');
//     }

//     // Validate experience exists and user owns it

//     // if (experience.userId !== userId) {
//     //   throw new ForbiddenException(
//     //     'You can only create coupons for your own experiences',
//     //   );
//     // }

//     // Validate dates
//     if (new Date(data.validFrom) >= new Date(data.validTo)) {
//       throw new BadRequestException(
//         'Valid from date must be before valid to date',
//       );
//     }

//     if (new Date(data.validTo) <= new Date()) {
//       throw new BadRequestException('Valid to date must be in the future');
//     }

//     // Generate unique coupon code
//     const code = await this.generateUniqueCouponCode();

//     // Generate QR code
//     const qrCodeData = await this.generateQRCode(code);

//     return this.prisma.$transaction(async (tx) => {
//       // Create coupon
//       const coupon = await tx.coupon.create({
//         data: {
//           code,
//           qrCode: qrCodeData as string,
//           userId,
//           experienceId: data.experienceId,
//           type: data.type,
//           title: data.title,
//           description: data.description,
//           value: data.value,
//           currency: data.currency || 'USD',
//           discountPercent: data.discountPercent || 0,
//           maxUses: data.maxUses || 1,
//           validFrom: new Date(data.validFrom),
//           validTo: new Date(data.validTo),
//         },
//         include: {
//           user: { select: { id: true, name: true, email: true } },
//         },
//       });

//       return coupon;
//     });
//   }

//   async updateCoupon(couponId: string, userId: string, data: UpdateCouponDto) {
//     const coupon = await this.prisma.coupon.findUnique({
//       where: { id: couponId },
//       include: { experience: true },
//     });

//     if (!coupon) {
//       throw new NotFoundException('Coupon not found');
//     }

//     // if (coupon.experience.userId !== userId) {
//     //   throw new ForbiddenException('You can only update your own coupons');
//     // }

//     // Prevent updates if coupon has been used
//     if (coupon.usedCount > 0) {
//       throw new BadRequestException('Cannot update coupon that has been used');
//     }

//     // Validate dates if provided
//     if (data.validFrom && data.validTo) {
//       if (new Date(data.validFrom) >= new Date(data.validTo)) {
//         throw new BadRequestException(
//           'Valid from date must be before valid to date',
//         );
//       }
//     }

//     // Check coupon exists and user owns it

//     const updatedCoupon = await this.prisma.coupon.update({
//       where: { id: couponId },
//       data: {
//         ...data,
//         validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
//         validTo: data.validTo ? new Date(data.validTo) : undefined,
//         updatedAt: new Date(),
//       },
//       include: {
//         user: { select: { id: true, name: true, email: true } },
//         experience: { select: { id: true, name: true } },
//       },
//     });

//     return {
//       status: true,
//       message: 'Coupon updated successfully',
//       data: updatedCoupon,
//     };
//   }

//   async deleteCoupon(couponId: string, userId: string) {
//     const coupon = await this.prisma.coupon.findUnique({
//       where: { id: couponId },
//       include: { experience: true },
//     });

//     if (!coupon) {
//       throw new NotFoundException('Coupon not found');
//     }

//     if (coupon.experience.userId !== userId) {
//       throw new ForbiddenException('You can only delete your own coupons');
//     }

//     // Soft delete - mark as cancelled instead of hard delete
//     const deletedCoupon = await this.prisma.coupon.update({
//       where: { id: couponId },
//       data: {
//         status: CouponStatus.CANCELLED,
//         isActive: false,
//         updatedAt: new Date(),
//       },
//     });

//     return {
//       status: true,
//       message: 'Coupon cancelled successfully',
//       data: deletedCoupon,
//     };
//   }

//   // ============= COUPON RETRIEVAL =============

//   async getCoupons(filters: CouponFilters, pagination: PaginationOptions = {}) {
//     const {
//       page = 1,
//       limit = 20,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//     } = pagination;

//     const skip = (page - 1) * limit;
//     const where: Prisma.CouponWhereInput = {};

//     // Apply filters
//     if (filters.userId) where.userId = filters.userId;
//     if (filters.experienceId) where.experienceId = filters.experienceId;
//     if (filters.type) where.type = filters.type;
//     if (filters.status) where.status = filters.status;
//     if (filters.isActive !== undefined) where.isActive = filters.isActive;

//     if (filters.validFrom || filters.validTo) {
//       where.AND = [];
//       if (filters.validFrom) {
//         where.AND.push({ validFrom: { gte: filters.validFrom } });
//       }
//       if (filters.validTo) {
//         where.AND.push({ validTo: { lte: filters.validTo } });
//       }
//     }

//     if (filters.search) {
//       where.OR = [
//         { title: { contains: filters.search, mode: 'insensitive' } },
//         { description: { contains: filters.search, mode: 'insensitive' } },
//         { code: { contains: filters.search, mode: 'insensitive' } },
//       ];
//     }

//     const [coupons, total] = await Promise.all([
//       this.prisma.coupon.findMany({
//         where,
//         skip,
//         take: limit,
//         orderBy: { [sortBy]: sortOrder },
//         include: {
//           user: { select: { id: true, name: true, email: true } },
//           experience: { select: { id: true, name: true } },
//           redemptions: {
//             select: {
//               id: true,
//               redeemedAt: true,
//               amountUsed: true,
//               customer: { select: { id: true, name: true } },
//             },
//           },
//           _count: { select: { redemptions: true } },
//         },
//       }),
//       this.prisma.coupon.count({ where }),
//     ]);

//     return {
//       data: coupons,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     };
//   }

//   async getCouponById(couponId: string, userId?: string) {
//     const coupon = await this.prisma.coupon.findUnique({
//       where: { id: couponId },
//       include: {
//         user: { select: { id: true, name: true, email: true } },
//         experience: {
//           select: {
//             id: true,
//             name: true,
//             user: { select: { id: true, name: true } },
//           },
//         },
//         redemptions: {
//           include: {
//             customer: { select: { id: true, name: true, email: true } },
//             host: { select: { id: true, name: true } },
//           },
//           orderBy: { redeemedAt: 'desc' },
//         },
//         purchaseTransaction: {
//           select: {
//             id: true,
//             amount: true,
//             currency: true,
//             createdAt: true,
//             payer: { select: { id: true, name: true } },
//           },
//         },
//       },
//     });

//     if (!coupon) {
//       throw new NotFoundException('Coupon not found');
//     }

//     // Check permissions - only owner or system can see all details
//     if (
//       userId &&
//       coupon.experience.user.id !== userId &&
//       coupon.userId !== userId
//     ) {
//       // Return limited info for non-owners
//       return {
//         id: coupon.id,
//         title: coupon.title,
//         description: coupon.description,
//         type: coupon.type,
//         value: coupon.value,
//         currency: coupon.currency,
//         validFrom: coupon.validFrom,
//         validTo: coupon.validTo,
//         experience: coupon.experience,
//       };
//     }

//     return coupon;
//   }

//   async getCouponByCode(code: string) {
//     const coupon = await this.prisma.coupon.findUnique({
//       where: { code },
//       include: {
//         user: { select: { id: true, name: true } },
//         experience: {
//           select: {
//             id: true,
//             name: true,
//             user: { select: { id: true, name: true } },
//           },
//         },
//       },
//     });

//     if (!coupon) {
//       throw new NotFoundException('Coupon not found');
//     }

//     return coupon;
//   }

//   // ============= COUPON REDEMPTION =============

//   async redeemCoupon(data: RedeemCouponDto) {
//     return this.prisma.$transaction(async (tx) => {
//       // Find coupon by code
//       const coupon = await tx.coupon.findUnique({
//         where: { code: data.couponCode },
//         include: {
//           experience: true,
//           redemptions: true,
//         },
//       });

//       if (!coupon) {
//         throw new NotFoundException('Invalid coupon code');
//       }

//       // Validate coupon can be redeemed
//       await this.validateCouponForRedemption(coupon, data.experienceId);

//       // Determine amount used
//       const amountUsed = data.amountUsed || coupon.value;

//       if (amountUsed > coupon.value) {
//         throw new BadRequestException('Amount used cannot exceed coupon value');
//       }

//       // Create redemption record
//       const redemption = await tx.couponRedemption.create({
//         data: {
//           couponId: coupon.id,
//           customerId: coupon.userId,
//           experienceId: data.experienceId,
//           hostId: data.hostId,
//           amountUsed,
//           notes: data.notes,
//           ipAddress: data.ipAddress,
//           location: data.location,
//         },
//         include: {
//           coupon: true,
//           customer: { select: { id: true, name: true, email: true } },
//           experience: { select: { id: true, name: true } },
//           host: { select: { id: true, name: true } },
//         },
//       });

//       // Update coupon usage
//       const newUsedCount = coupon.usedCount + 1;
//       const newStatus =
//         newUsedCount >= coupon.maxUses ? CouponStatus.USED : coupon.status;

//       await tx.coupon.update({
//         where: { id: coupon.id },
//         data: {
//           usedCount: newUsedCount,
//           status: newStatus,
//           updatedAt: new Date(),
//         },
//       });

//       return redemption;
//     });
//   }

//   async validateCouponForRedemption(coupon: any, experienceId: string) {
//     // Check if coupon is active
//     if (!coupon.isActive) {
//       throw new BadRequestException('Coupon is not active');
//     }

//     // Check status
//     if (coupon.status === CouponStatus.USED) {
//       throw new BadRequestException('Coupon has already been fully used');
//     }

//     if (coupon.status === CouponStatus.EXPIRED) {
//       throw new BadRequestException('Coupon has expired');
//     }

//     if (coupon.status === CouponStatus.CANCELLED) {
//       throw new BadRequestException('Coupon has been cancelled');
//     }

//     // Check experience match
//     if (coupon.experienceId !== experienceId) {
//       throw new BadRequestException('Coupon is not valid for this experience');
//     }

//     // Check date validity
//     const now = new Date();
//     if (now < coupon.validFrom) {
//       throw new BadRequestException('Coupon is not yet valid');
//     }

//     if (now > coupon.validTo) {
//       // Auto-expire the coupon
//       await this.prisma.coupon.update({
//         where: { id: coupon.id },
//         data: { status: CouponStatus.EXPIRED },
//       });
//       throw new BadRequestException('Coupon has expired');
//     }

//     // Check usage limits
//     if (coupon.usedCount >= coupon.maxUses) {
//       throw new BadRequestException('Coupon usage limit exceeded');
//     }

//     return true;
//   }

//   // ============= ANALYTICS & REPORTING =============

//   async getCouponAnalytics(filters: CouponFilters): Promise<CouponAnalytics> {
//     const where: Prisma.CouponWhereInput = {};

//     if (filters.userId) where.userId = filters.userId;
//     if (filters.experienceId) where.experienceId = filters.experienceId;
//     if (filters.validFrom || filters.validTo) {
//       where.AND = [];
//       if (filters.validFrom) {
//         where.AND.push({ validFrom: { gte: filters.validFrom } });
//       }
//       if (filters.validTo) {
//         where.AND.push({ validTo: { lte: filters.validTo } });
//       }
//     }

//     const [aggregates, byType, byStatus, recentRedemptions] = await Promise.all(
//       [
//         this.prisma.coupon.aggregate({
//           where,
//           _sum: { value: true, usedCount: true },
//           _count: true,
//         }),
//         this.prisma.coupon.groupBy({
//           by: ['type'],
//           where,
//           _sum: { value: true },
//           _count: true,
//         }),
//         this.prisma.coupon.groupBy({
//           by: ['status'],
//           where,
//           _sum: { value: true },
//           _count: true,
//         }),
//         this.prisma.couponRedemption.findMany({
//           where: filters.experienceId
//             ? { experienceId: filters.experienceId }
//             : {},
//           include: {
//             coupon: { select: { title: true, code: true } },
//             customer: { select: { name: true } },
//             experience: { select: { name: true } },
//           },
//           orderBy: { redeemedAt: 'desc' },
//           take: 10,
//         }),
//       ],
//     );

//     const totalCoupons = aggregates._count;
//     const totalValue = Number(aggregates._sum.value || 0);
//     const totalRedemptions = Number(aggregates._sum.usedCount || 0);

//     // Calculate status counts
//     const statusCounts = byStatus.reduce(
//       (acc, item) => {
//         acc[item.status] = item._count;
//         return acc;
//       },
//       {} as Record<string, number>,
//     );

//     const activeCoupons = statusCounts[CouponStatus.ACTIVE] || 0;
//     const usedCoupons = statusCounts[CouponStatus.USED] || 0;
//     const expiredCoupons = statusCounts[CouponStatus.EXPIRED] || 0;

//     // Calculate redeemed value
//     const redeemedValue = await this.prisma.couponRedemption.aggregate({
//       where: filters.experienceId ? { experienceId: filters.experienceId } : {},
//       _sum: { amountUsed: true },
//     });

//     const redemptionRate =
//       totalCoupons > 0 ? (totalRedemptions / totalCoupons) * 100 : 0;

//     return {
//       totalCoupons,
//       activeCoupons,
//       usedCoupons,
//       expiredCoupons,
//       totalValue,
//       redeemedValue: Number(redeemedValue._sum.amountUsed || 0),
//       redemptionRate,
//       byType: byType.reduce(
//         (acc, item) => {
//           acc[item.type] = {
//             count: item._count,
//             value: Number(item._sum.value || 0),
//           };
//           return acc;
//         },
//         {} as Record<string, { count: number; value: number }>,
//       ),
//       byStatus: byStatus.reduce(
//         (acc, item) => {
//           acc[item.status] = {
//             count: item._count,
//             value: Number(item._sum.value || 0),
//           };
//           return acc;
//         },
//         {} as Record<string, { count: number; value: number }>,
//       ),
//       recentRedemptions,
//     };
//   }

//   // ============= UTILITY METHODS =============

//   private async generateUniqueCouponCode(): Promise<string> {
//     let code: string;
//     let isUnique = false;

//     while (!isUnique) {
//       // Generate 8-character alphanumeric code
//       code = randomBytes(4).toString('hex').toUpperCase();

//       const existing = await this.prisma.coupon.findUnique({
//         where: { code },
//       });

//       if (!existing) {
//         isUnique = true;
//       }
//     }

//     return code!;
//   }

//   private async generateQRCode(code: string): Promise<string> {
//     try {
//       // Generate QR code as data URL
//       // const qrCodeDataURL = await QRCode.toDataURL(code, {
//       // TODO: Install qrcode package and uncomment
//       const qrCodeDataURL = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50" y="50" text-anchor="middle">${code}</text></svg>`).toString('base64')}`; // Temporary placeholder
//       //   errorCorrectionLevel: 'M',
//       //   type: 'image/png',
//       //   quality: 0.92,
//       //   margin: 1,
//       //   color: {
//       //     dark: '#000000',
//       //     light: '#FFFFFF',
//       //   },
//       // });

//       return qrCodeDataURL;
//     } catch (error) {
//       console.error('QR Code generation failed:', error);
//       return '';
//     }
//   }

//   // ============= BATCH OPERATIONS =============

//   async expireOldCoupons() {
//     const now = new Date();

//     const result = await this.prisma.coupon.updateMany({
//       where: {
//         validTo: { lt: now },
//         status: { not: CouponStatus.EXPIRED },
//         isActive: true,
//       },
//       data: {
//         status: CouponStatus.EXPIRED,
//         updatedAt: now,
//       },
//     });

//     return { expiredCount: result.count };
//   }

//   async getUserCoupons(userId: string, includeExpired = false) {
//     const where: Prisma.CouponWhereInput = {
//       experience: {
//         bookings: {
//           some: {
//             userId,
//           },
//         },
//       },
//     };

//     if (!includeExpired) {
//       where.status = { not: CouponStatus.EXPIRED };
//       where.validTo = { gt: new Date() };
//     }

//     return this.prisma.coupon.findMany({
//       where,
//       include: {
//         experience: {
//           select: {
//             id: true,
//             name: true,
//             address: true,
//             user: { select: { name: true } },
//           },
//         },
//         redemptions: {
//           select: {
//             id: true,
//             redeemedAt: true,
//             amountUsed: true,
//           },
//         },
//       },
//       orderBy: { createdAt: 'desc' },
//     });
//   }

//   async getAllCoupons(query: any) {
//     const parsedQuery = couponQuerySchema.parse(query);
//     const {
//       page = '1',
//       limit = '20',
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//       sort,
//       search,
//       isActive,
//       status,
//       experienceId,
//       type,
//       validFrom,
//       validTo,
//     } = parsedQuery;

//     const pageNum = parseInt(page, 10);
//     const pageSize = parseInt(limit, 10);
//     const skip = (pageNum - 1) * pageSize;

//     const where: Prisma.CouponWhereInput = {};

//     if (search) {
//       // Support both free-text and key=value style from DataTable (e.g., 'title=abc')
//       const eqIdx = search.indexOf('=');
//       if (eqIdx > -1) {
//         const key = search.slice(0, eqIdx).trim();
//         const value = search.slice(eqIdx + 1).trim();
//         const allowed: Array<keyof Prisma.CouponWhereInput> = [
//           'title',
//           'description',
//           'code',
//         ];
//         if (value) {
//           if (allowed.includes(key as any)) {
//             const cond: any = { contains: value, mode: 'insensitive' as const };
//             if (key === 'title') where.title = cond;
//             else if (key === 'description') where.description = cond;
//             else if (key === 'code') where.code = cond;
//           } else {
//             where.OR = [
//               { title: { contains: value, mode: 'insensitive' } },
//               { description: { contains: value, mode: 'insensitive' } },
//               { code: { contains: value, mode: 'insensitive' } },
//             ];
//           }
//         }
//       } else {
//         where.OR = [
//           { title: { contains: search, mode: 'insensitive' } },
//           { description: { contains: search, mode: 'insensitive' } },
//           { code: { contains: search, mode: 'insensitive' } },
//         ];
//       }
//     }

//     if (isActive !== undefined) where.isActive = isActive;
//     if (status) {
//       if (typeof status === 'string' && status.includes('.')) {
//         const statuses = status.split('.').filter(Boolean) as CouponStatus[];
//         where.status = { in: statuses } as any;
//       } else {
//         where.status = status as CouponStatus;
//       }
//     }
//     if (experienceId) where.experienceId = experienceId;
//     if (type) {
//       if (typeof type === 'string' && type.includes('.')) {
//         const types = type.split('.').filter(Boolean) as CouponType[];
//         where.type = { in: types } as any;
//       } else {
//         where.type = type as CouponType;
//       }
//     }
//     if (validFrom || validTo) {
//       const andFilters: Prisma.CouponWhereInput[] = [];
//       if (validFrom) {
//         andFilters.push({ validFrom: { gte: new Date(validFrom) } });
//       }
//       if (validTo) {
//         andFilters.push({ validTo: { lte: new Date(validTo) } });
//       }
//       if (andFilters.length > 0) {
//         where.AND = andFilters;
//       }
//     }

//     // Compute sorting: prefer `sort` (e.g., "createdAt.desc") if provided
//     let finalSortBy = sortBy as string;
//     let finalSortOrder = (sortOrder as Prisma.SortOrder) || 'desc';
//     if (sort) {
//       const [field, dir] = String(sort).split('.');
//       if (field) finalSortBy = field;
//       if (dir === 'asc' || dir === 'desc') finalSortOrder = dir;
//     }

//     const orderRaw: Record<string, Prisma.SortOrder> = {
//       [finalSortBy]: finalSortOrder,
//     };

//     const [data, total] = await this.prisma.$transaction([
//       this.prisma.coupon.findMany({
//         where,
//         skip,
//         take: pageSize,
//         orderBy: orderRaw,
//       }),
//       this.prisma.coupon.count({ where }),
//     ]);

//     return {
//       status: true,
//       data: data,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / pageSize),
//       },
//     };
//   }

//   async getExperienceCoupons(experienceId: string, hostId: string) {
//     // Verify host owns the experience
//     const experience = await this.prisma.experience.findUnique({
//       where: { id: experienceId },
//     });

//     if (!experience || experience.userId !== hostId) {
//       throw new ForbiddenException('Access denied');
//     }

//     return this.prisma.coupon.findMany({
//       where: { experienceId },
//       include: {
//         user: { select: { id: true, name: true, email: true } },
//         redemptions: {
//           include: {
//             customer: { select: { name: true, email: true } },
//           },
//           orderBy: { redeemedAt: 'desc' },
//         },
//       },
//       orderBy: { createdAt: 'desc' },
//     });
//   }
// }
