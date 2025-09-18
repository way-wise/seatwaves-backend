import { z } from 'zod';

export const queryCategorySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
