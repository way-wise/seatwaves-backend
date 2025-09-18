import { HelpType } from '@prisma/client';
import { z } from 'zod';

const HelpFaqStatus = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

export const createHelpSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(500, 'Question too long'),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer too long'),
  type: z.nativeEnum(HelpType).default(HelpType.OTHER),
  status: HelpFaqStatus.default('PUBLISHED'),
  blogId: z.string().optional(),
});

export type CreateHelpDto = z.infer<typeof createHelpSchema>;
