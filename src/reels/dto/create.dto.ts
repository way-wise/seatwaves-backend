import { z } from 'zod';
import { ReelPlatform } from '@prisma/client';

// Helper regex for URL validation (loose)
const urlRegex =
  /^(https?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:\/?#\[\]@!$&'()*+,;=.]*$/i;

export const createReelsSchema = z.object({
  platform: z.nativeEnum(ReelPlatform),
  // Accept either a pure ID or a full URL; service will normalize to ID
  videoId: z.string().trim().min(1, 'videoId or URL is required'),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  thumbnail: z
    .string()
    .trim()
    .regex(urlRegex, 'thumbnail must be a valid URL')
    .optional(),
  duration: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 3)
    .optional(), // up to 3 hours
  experienceId: z.string().trim().min(1, 'experienceId is required'),
  isActive: z.boolean().optional().default(true),
});

export type CreateReelsDto = z.infer<typeof createReelsSchema>;
