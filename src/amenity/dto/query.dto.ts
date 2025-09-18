import { z } from 'zod';

export const queryAmenitySchema = z.object({
  search: z.string().optional(),
});
