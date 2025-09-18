import { z } from 'zod';

export const redeemPointsSchema = z.object({
  userId: z.string(),
  points: z.number(),
  rewardCode: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type RedeemPointsDto = z.infer<typeof redeemPointsSchema>;
