import { CouponStatus, CouponType } from '@prisma/client';
import { z } from 'zod';

export const couponQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  // DataTable sends `sort` as "field.order"; keep legacy sortBy/sortOrder defaults
  sort: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  experienceId: z.string().optional(),
  // Allow native enum or dot-separated multi-select strings (handled in service)
  type: z.union([z.nativeEnum(CouponType), z.string()]).optional(),
  status: z.union([z.nativeEnum(CouponStatus), z.string()]).optional(),
  // Coerce string 'true'/'false' to boolean for filter toggles
  isActive: z
    .preprocess((v) => {
      if (typeof v === 'string') return v === 'true';
      return v;
    }, z.boolean())
    .optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  search: z.string().optional(),
});
