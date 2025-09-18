import { ExperienceStatus } from '@prisma/client';
import { z } from 'zod';

export const querySchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  status: z.nativeEnum(ExperienceStatus).optional(),
  category: z.string().optional(),
  rating: z.string().optional(),
  priceMin: z.string().optional(),
  priceMax: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().ulid().optional(),
});
