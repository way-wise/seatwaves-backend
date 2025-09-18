import { z } from 'zod';

export const informationSchema = z.object({
  name: z.string().min(1),
  shortDesc: z.string().min(1),
  categoryId: z.string().ulid(),
});
