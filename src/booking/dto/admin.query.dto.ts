import { BookingStatus } from '@prisma/client';
import { z } from 'zod';

export const adminQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  sort: z.enum(['createdAt', 'startDate', 'total']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  experienceId: z.string().optional(),
  eventId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AdminQueryDto = z.infer<typeof adminQuerySchema>;
