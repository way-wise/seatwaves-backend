import { MediaType } from '@prisma/client';
import { z } from 'zod';

export const createMediaSchema = z.object({
  experienceId: z.string().ulid(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.nativeEnum(MediaType).default(MediaType.IMAGE),
});
