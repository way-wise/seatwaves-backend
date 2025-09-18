import { HelpType } from '@prisma/client';
import { z } from 'zod';

const HelpFaqStatus = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

export const updateHelpSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(500, 'Question too long')
    .optional(),
  answer: z
    .string()
    .min(1, 'Answer is required')
    .max(5000, 'Answer too long')
    .optional(),
  type: z.nativeEnum(HelpType).optional(),
  status: HelpFaqStatus.optional(),
  blogId: z.string().optional(),
});

export type UpdateHelpDto = z.infer<typeof updateHelpSchema>;
