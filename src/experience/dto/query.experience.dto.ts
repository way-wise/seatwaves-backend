import { ExperienceStatus } from '@prisma/client';
import { date, z } from 'zod';

export const queryExperienceSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  rating: z.string().optional(),
  priceMin: z.string().optional(),
  priceMax: z.string().optional(),
  address: z.string().optional(),
  lattitude: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  longitude: z.string().optional(),
  sortBy: z.enum(['createdAt', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().ulid().optional(),
});

export type QueryExperienceDto = z.infer<typeof queryExperienceSchema>;
