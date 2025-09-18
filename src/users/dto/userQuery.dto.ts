import { UserStatus } from '@prisma/client';
import { z } from 'zod';

export const userQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  // Accept either a single enum value or a dot-separated string of values (e.g., "ACTIVE.BLOCKED")
  status: z.union([z.nativeEnum(UserStatus), z.string()]).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  // Inactivity filter based on lastLoginAt, e.g., '30d', '90d', '6m', '1y'
  inactive: z.string().optional(),
});
