import { z } from 'zod';

export const resendOtpSchema = z.object({
  email: z.string().email(),
  type: z
    .enum(['VERIFY_EMAIL', 'TWO_FACTOR', 'RESET_PASSWORD'])
    .optional()
    .default('VERIFY_EMAIL'),
});

export type ResendOtpDto = z.infer<typeof resendOtpSchema>;
