// import { ExperienceStatus } from '@prisma/client';
// import { z } from 'zod';

// export const adminQuerySchema = z.object({
//   search: z.string().optional(),
//   status: z.nativeEnum(ExperienceStatus).optional(),
//   page: z.string().optional(),
//   limit: z.string().optional(),
//   sortBy: z.enum(['createdAt', 'price']).optional(),
//   sortOrder: z.enum(['asc', 'desc']).optional(),
//   period: z.enum(['daily', 'weekly', 'monthly']).optional(),
//   from: z.string().optional(),
//   to: z.string().optional(),
//   view: z.enum(['all', 'trending', 'underperforming']).optional(),
// });

// export type AdminQueryDto = z.infer<typeof adminQuerySchema>;
