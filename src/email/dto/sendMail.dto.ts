//Send Mail Dto

import { z } from 'zod';

export const sendEmailSchema = z.object({
  subject: z.string(),
  text: z.string(),
  html: z.string().optional(),
});

export type SendEmailDto = z.infer<typeof sendEmailSchema>;
