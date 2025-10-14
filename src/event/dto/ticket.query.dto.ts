import { z } from 'zod';
import { eventQuerySchema } from './event.query.dto';

export const ticketQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  cursor: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['price', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type EventQuery = z.infer<typeof eventQuerySchema>;
