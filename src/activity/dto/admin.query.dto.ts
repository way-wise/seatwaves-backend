import { z } from 'zod';

export const adminQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  range: z
    .enum(['all', 'today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear'])
    .optional(),
  // Optional explicit date range overrides (YYYY-MM-DD)
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'userId', 'type', 'action', 'ipAddress']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type AdminQueryDto = z.infer<typeof adminQuerySchema>;
