import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  about: z.string().optional(),
  dob: z.coerce.date().optional(),
  governmentID: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
