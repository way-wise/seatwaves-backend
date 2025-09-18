import { z } from 'zod';

export const createContactInfoSchema = z.object({
  email: z.string().email(),
  secondaryEmail: z.string().email().optional().nullable(),
  phone: z.string(),
  phoneMessage: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  secondaryAddress: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable(),
});

export type CreateContactInfoDto = z.infer<typeof createContactInfoSchema>;

export const updateContactInfoSchema = createContactInfoSchema.partial();
export type UpdateContactInfoDto = z.infer<typeof updateContactInfoSchema>;
