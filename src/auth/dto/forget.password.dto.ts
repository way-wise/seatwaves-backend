import { z } from 'zod';

export const ForgetPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgetPasswordDto = z.infer<typeof ForgetPasswordSchema>;
