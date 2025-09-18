import { z } from 'zod';

export const reviewQueryByHostSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  rating: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'rating']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ReviewQueryByHost = z.infer<typeof reviewQueryByHostSchema>;
