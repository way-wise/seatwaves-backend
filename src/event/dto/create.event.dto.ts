import { z } from 'zod';

export const SeatSchema = z.object({
  id: z.string().min(1),
  seatId: z.string().min(1),
  row: z.string().optional(),
  number: z.number().optional(),
  section: z.string().optional(),
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
  endTime: z.coerce.date(),
  duration: z.number().min(1), // duration in minutes
  sellerId: z.string().min(1),
  categoryId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  seats: z.array(SeatSchema).optional().default([]),
});
