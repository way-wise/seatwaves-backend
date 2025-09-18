import { z } from 'zod';

export const initializeExperienceSchema = z.object({
  name: z.string().min(1),
  shortDesc: z.string().min(1),
  categoryId: z.string().ulid(),
  tags: z.array(z.string()).optional(),
});

export type InitializeExperienceDto = z.infer<
  typeof initializeExperienceSchema
>;
