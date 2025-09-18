import { z } from 'zod';

export const SidebarQuerySchema = z.object({
  cursor: z.string().ulid().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type SidebarQuery = z.infer<typeof SidebarQuerySchema>;
