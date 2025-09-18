//cursor pagination

import { z } from 'zod';

export const WishlistQuerySchema = z.object({
  cursor: z.string().ulid().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
