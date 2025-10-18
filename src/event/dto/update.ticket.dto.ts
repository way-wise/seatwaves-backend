import { z } from 'zod';

export const updateticketSchema = z.object({
  ticketType: z.string().optional(),
  seatDetails: z.string(),
  metadata: z.record(z.any()).optional(),
  price: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional().default('FIXED'),
  thumbnail: z.string().optional(),
});
