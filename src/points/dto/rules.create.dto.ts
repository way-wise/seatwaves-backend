import { PointRuleAction } from '@prisma/client';
import { z } from 'zod';

export const createRuleSchema = z.object({
  action: z.nativeEnum(PointRuleAction),
  name: z.string(),
  basePoints: z.number(),
  perUnit: z.boolean().optional(),
  unitAmount: z.number().optional(),
  tierMultipliers: z.record(z.string(), z.number()).optional(),
  expiryMonths: z.number().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateRuleDto = z.infer<typeof createRuleSchema>;
