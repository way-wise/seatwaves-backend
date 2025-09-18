import { EventStatus } from '@prisma/client';
import { z } from 'zod';

export const adminEventQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  sortBy: z.enum(['date', 'updatedAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  experienceId: z.string().optional(),
  userId: z.string().optional(),
});
