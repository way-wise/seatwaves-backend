import { NotificationType } from '@prisma/client';
import { z } from 'zod';

export const notificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().url().optional(),
  type: z.nativeEnum(NotificationType).default(NotificationType.NOTIFY),
});
