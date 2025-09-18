import { z } from 'zod';
import { CouponType, CouponStatus } from '@prisma/client';

// ============= ZOD SCHEMAS =============

export const CreateCouponSchema = z
  .object({
    experienceId: z.string().ulid('Experience ID must be a valid UUID'),
    type: z.nativeEnum(CouponType, {
      errorMap: () => ({ message: 'Invalid coupon type' }),
    }),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    value: z.number().min(0, 'Value must be non-negative').multipleOf(0.01),
    currency: z.string().optional().default('USD'),
    discountPercent: z.number().min(0).max(100).optional(),
    maxUses: z.number().int().min(1).optional().default(1),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
  })
  .refine((data) => data.validTo > data.validFrom, {
    message: 'Valid to date must be after valid from date',
    path: ['validTo'],
  });

export const UpdateCouponSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    value: z.number().min(0).multipleOf(0.01).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    maxUses: z.number().int().min(1).optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return data.validTo > data.validFrom;
      }
      return true;
    },
    {
      message: 'Valid to date must be after valid from date',
      path: ['validTo'],
    },
  );

export const RedeemCouponSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
  experienceId: z.string().ulid('Experience ID must be a valid ULID'),
  hostId: z.string().ulid('Host ID must be a valid ULID'),
  amountUsed: z.number().min(0).multipleOf(0.01).optional(),
  notes: z.string().optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
});

export const CouponQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  experienceId: z.string().uuid().optional(),
  type: z.nativeEnum(CouponType).optional(),
  status: z.nativeEnum(CouponStatus).optional(),
  isActive: z.coerce.boolean().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
  hasUsesRemaining: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============= TYPE EXPORTS =============

export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponDto = z.infer<typeof UpdateCouponSchema>;
export type RedeemCouponDto = z.infer<typeof RedeemCouponSchema>;
export type CouponQueryDto = z.infer<typeof CouponQuerySchema>;
