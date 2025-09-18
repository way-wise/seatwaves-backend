import { z } from 'zod';

export const updateCategorySchema = z.object({
  name: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  parentId: z.string().optional().nullable(),
  slug: z.string().optional(),
});

export type updateCategoryDto = z.infer<typeof updateCategorySchema>;
