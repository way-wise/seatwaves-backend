import { z } from 'zod';

const HelpType = z.enum([
  'BOOKING',
  'PAYMENT',
  'EVENT',
  'EXPERIENCE',
  'ACCOUNT',
  'COUPON',
  'REVIEW',
  'MESSAGE',
  'NOTIFICATION',
  'SYSTEM',
  'OTHER',
  'BECOMEHOST',
]);

const HelpFaqStatus = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

export const createHelpSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(500, 'Question too long'),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer too long'),
  type: HelpType.default('OTHER'),
  status: HelpFaqStatus.default('PUBLISHED'),
  blogId: z.string().optional(),
});

export type CreateHelpDto = z.infer<typeof createHelpSchema>;
