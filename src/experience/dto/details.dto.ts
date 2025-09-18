import { z } from 'zod';

export const detailsSchema = z.object({
  detailsDesc: z
    .string()
    .min(1)
    .max(1000, { message: 'Description must be at most 1000 characters long' }),
  includes: z.array(z.string()).optional(),
  notes: z.string(),
});
