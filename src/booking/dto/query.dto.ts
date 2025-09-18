import { z } from 'zod';

export const queryBookingSchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
      'CANCELLED',
      'EXPIRED',
    ])
    .optional(),
  sortBy: z.enum(['createdAt', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
