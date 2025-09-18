import { z } from 'zod';

export const createHeroSection = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
});

export type CreateHeroSectionDto = z.infer<typeof createHeroSection>;

export const updateHeroSection = createHeroSection.partial();
export type UpdateHeroSectionDto = z.infer<typeof updateHeroSection>;
