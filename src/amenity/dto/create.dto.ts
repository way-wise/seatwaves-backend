import { z } from 'zod';

export const createAmenitySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
});

export const updateAmenitySchema = createAmenitySchema.partial();

export type CreateAmenityDto = z.infer<typeof createAmenitySchema>;
export type UpdateAmenityDto = z.infer<typeof updateAmenitySchema>;
