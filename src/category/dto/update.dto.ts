import { z } from 'zod';

export const updateCategorySchema = z.object({
  name: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export type updateCategoryDto = z.infer<typeof updateCategorySchema>;
