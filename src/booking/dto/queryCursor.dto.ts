import { z } from 'zod';

export const HostBookingQuerySchema = z.object({
  cursor: z.string().ulid().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type HostBookingQuery = z.infer<typeof HostBookingQuerySchema>;
