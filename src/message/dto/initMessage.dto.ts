import { z } from 'zod';

export const initMessageSchema = z.object({
  bookingId: z.string().ulid().optional(),
  experienceId: z.string().ulid(),
  message: z.string().min(1),
});

export type InitMessageDto = z.infer<typeof initMessageSchema>;
