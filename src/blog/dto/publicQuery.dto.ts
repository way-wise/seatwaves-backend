import z from 'zod';

export const publicQuerySchema = z.object({
  limit: z.string().optional(),
  page: z.string().optional(),
  // Cursor for keyset pagination (base64-encoded JSON string)
  cursor: z.string().optional(),
  sortBy: z.enum(['publishedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});
