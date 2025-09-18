import { z } from 'zod';

export const CreateStripeAccountSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  country: z.string(),
  businessType: z.enum(['individual', 'company']).optional(),
});

export type CreateStripeAccountDto = z.infer<typeof CreateStripeAccountSchema>;
