import { z } from 'zod';

export const updateSeatSchema = z.object({
  id: z.string().min(1),
  row: z.string().optional(),
  number: z.number().optional(),
  section: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  price: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional().default('FIXED'),
});
