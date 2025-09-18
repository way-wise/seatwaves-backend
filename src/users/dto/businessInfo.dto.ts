import { z } from 'zod';

export const businessInfoSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  description: z.string().min(1),
  registrationNumber: z.string().min(1),
  taxvatNumber: z.string().min(1),
  businessPhone: z.string().min(1),
  businessEmail: z.string().email(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  address: z.string().min(1),
  streetAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().min(1),
  socialLinks: z.array(z.string()).optional(),
});
