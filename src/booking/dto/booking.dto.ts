import { z } from 'zod';

export const createBookingSchema = z.object({
  eventId: z.string().ulid(),
  guestCount: z.number().int().min(1),
  couponId: z.string().ulid().optional(),
});

export const updateBookingDto = createBookingSchema.partial();

export type createBookingDto = z.infer<typeof createBookingSchema>;
export type UpdateBookingDto = z.infer<typeof updateBookingDto>;
