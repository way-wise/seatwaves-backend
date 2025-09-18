import { z } from 'zod';

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
