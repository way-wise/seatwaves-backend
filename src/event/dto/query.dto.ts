import { z } from 'zod';

export const queryEventSchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  cursor: z.string().optional(),
  sortBy: z.enum(['startTime', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});
