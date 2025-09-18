import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const adminUpdateUserSchema = z.object({
  status: z.nativeEnum(UserStatus).optional(),
  blockedUntil: z.coerce.date().optional(),
});

export type AdminUpdateUserDto = z.infer<typeof adminUpdateUserSchema>;
