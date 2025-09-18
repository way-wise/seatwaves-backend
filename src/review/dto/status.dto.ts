import { z } from 'zod';

export const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export type StatusDto = z.infer<typeof statusSchema>;
