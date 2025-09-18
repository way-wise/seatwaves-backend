import { z } from 'zod';

export const contactEmailSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string(),
});

export type ContactEmailDto = z.infer<typeof contactEmailSchema>;
