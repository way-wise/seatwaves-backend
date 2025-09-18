import { z } from 'zod';

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(4, { message: 'Password must be at least 4 characters long' }),
});

export type UserLoginDto = z.infer<typeof UserLoginSchema>;
