import { z } from 'zod';

export const businessInfoUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  description: z.string().min(1).optional(),
  registrationNumber: z.string().min(1).optional(),
  taxvatNumber: z.string().min(1).optional(),
  businessPhone: z.string().min(1).optional(),
  businessEmail: z.string().email().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  streetAddress: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zipCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  socialLinks: z.array(z.string()).optional(),
});
