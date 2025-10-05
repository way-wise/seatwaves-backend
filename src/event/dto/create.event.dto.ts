import { z } from 'zod';

export const SeatSchema = z.object({
  seatId: z.string().min(1),
  seatNumber: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  price: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional().default('FIXED'),
});

export const createEventScehema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  eventId: z.string().min(1),
  venue: z.string().min(3).max(100),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  duration: z.number().optional().default(0), // duration in minutes
  sellerId: z.string().min(1),
  categoryId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  seats: z.array(SeatSchema).optional().default([]),
});
