import { PointRuleAction } from '@prisma/client';
import { z } from 'zod';

export const awardPointsSchema = z.object({
  userId: z.string(),
  action: z.nativeEnum(PointRuleAction),
  amountCents: z.number().optional(),
  referencedId: z.string().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AwardPointsDto = z.infer<typeof awardPointsSchema>;
