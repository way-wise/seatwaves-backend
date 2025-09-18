import { z } from 'zod';

export const AdminDashboardQuerySchema = z.object({
  duration: z.enum(['7d', '30d', '90d', '1y', 'all']).default('7d'),
});

export type AdminDashboardQueryDto = z.infer<typeof AdminDashboardQuerySchema>;
