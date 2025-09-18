import { z } from 'zod';

export const DashboardQuerySchema = z.object({
  duration: z.enum(['today', 'yesterday', '7d', '30d']).default('7d'),
});

export type DashboardQueryDto = z.infer<typeof DashboardQuerySchema>;
