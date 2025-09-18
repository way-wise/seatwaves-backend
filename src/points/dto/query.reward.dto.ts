import { PointRuleAction, RewardPointStatus } from '@prisma/client';
import { z } from 'zod';

export const queryRewardSchema = z.object({
  // General search. If provided as "key=value" it will search by exact/equality on that key,
  // otherwise it will search across common text fields.
  search: z.string().optional(),

  // Filters
  userId: z.string().optional(),
  status: z.nativeEnum(RewardPointStatus).optional(),
  action: z.nativeEnum(PointRuleAction).optional(),
  ruleId: z.string().optional(),

  // Date range filters (as ISO strings)
  earnedFrom: z.string().datetime().optional(),
  earnedTo: z.string().datetime().optional(),
  expiresFrom: z.string().datetime().optional(),
  expiresTo: z.string().datetime().optional(),

  // Pagination
  limit: z.string().optional(),
  page: z.string().optional(),

  // Sorting
  sortBy: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .transform((v) => (v === undefined ? 'desc' : v)),
});
