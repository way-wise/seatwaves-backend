import { BookingStatus } from '@prisma/client';
import { z } from 'zod';

export const queryBookingSchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  sortBy: z.enum(['createdAt', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
