import { PlatformType } from '@prisma/client';
import { z } from 'zod';

export const queryFeedbackSchema = z.object({
  limit: z.string().optional(),
  page: z.string().optional(),
  sortBy: z.enum(['createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  platform: z.nativeEnum(PlatformType).optional(),
});

export type QueryFeedbackDto = z.infer<typeof queryFeedbackSchema>;
