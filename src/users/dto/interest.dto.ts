import { z } from 'zod';

export const createInterestSchema = z.object({
  categoryIds: z
    .array(z.string().ulid())
    .min(1, 'At least one category is required'),
});

export type CreateInterestDto = z.infer<typeof createInterestSchema>;
