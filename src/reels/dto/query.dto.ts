// import { z } from 'zod';
// import { ReelPlatform } from '@prisma/client';

// const SortOrder = z.enum(['asc', 'desc']);
// const SortBy = z.enum(['createdAt', 'updatedAt', 'title', 'duration']);

// export const queryReelsSchema = z.object({
//   // cursor pagination
//   cursor: z.string().optional(),
//   limit: z.coerce.number().int().positive().max(100).default(20),

//   // filters
//   platform: z.nativeEnum(ReelPlatform).optional(),
//   experienceId: z.string().optional(),
//   createdById: z.string().optional(),
//   isActive: z.coerce.boolean().optional(),

//   // search
//   search: z.string().trim().min(1).optional(),

//   // date range
//   createdAfter: z.coerce.date().optional(),
//   createdBefore: z.coerce.date().optional(),

//   // sorting
//   sortBy: SortBy.default('createdAt'),
//   sortOrder: SortOrder.default('desc'),
// });

// export type QueryReelsDto = z.infer<typeof queryReelsSchema>;
