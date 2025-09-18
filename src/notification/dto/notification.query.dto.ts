import { z } from 'zod';

export const NotificationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.string().optional(),
});

export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;
