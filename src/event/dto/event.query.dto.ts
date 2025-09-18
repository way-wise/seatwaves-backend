import { z } from 'zod';

export const eventQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  cursor: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'guestCount', 'total', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.string().optional(),
  includeParticipants: z.string().optional().default('true'),
});

export type EventQuery = z.infer<typeof eventQuerySchema>;
