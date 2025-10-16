import { HelpType } from '@prisma/client';
import { z } from 'zod';

export const faqQuerySchema = z.object({
  // Cursor pagination
  page: z.string().default('1'),
  limit: z.string().default('20'),
  type: z.nativeEnum(HelpType).optional(),
  search: z.string().optional(),
});
export type FaqQueryDto = z.infer<typeof faqQuerySchema>;
