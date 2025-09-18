import { z } from 'zod';

export const updateEventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  eventId: z.string().min(1),
  venue: z.string().min(3).max(100),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  duration: z.number().min(1), // duration in minutes
  sellerId: z.string().min(1),
  categoryId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});
