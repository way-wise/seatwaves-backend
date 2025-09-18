import { z } from 'zod';
import { PlatformType } from '@prisma/client';

export const createFeedbackSchema = z.object({
  userId: z.string().optional(),
  message: z.string(),
  platform: z.nativeEnum(PlatformType).default(PlatformType.WEOUT_WEB),
  name: z.string(),
  email: z.string().email(),
});

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
