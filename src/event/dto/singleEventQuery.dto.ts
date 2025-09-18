import { z } from 'zod';

export const singleEventQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  sortBy: z.enum(['date', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
