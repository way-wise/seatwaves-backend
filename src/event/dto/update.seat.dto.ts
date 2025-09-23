import { z } from 'zod';

export const updateSeatSchema = z.object({
  row: z.string().optional(),
  number: z.number().optional(),
  section: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  price: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
});
