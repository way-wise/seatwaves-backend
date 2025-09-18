import { HelpType } from '@prisma/client';
import { nativeEnum, z } from 'zod';



const HelpFaqStatus = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

const SortOrder = z.enum(['asc', 'desc']);

const SortBy = z.enum(['createdAt', 'updatedAt', 'question', 'type']);

const IncludeDeleted = z.enum(['true', 'false']).default('false');

export const helpQuerySchema = z.object({
  // Cursor pagination
  cursor: z.string().optional(),
  limit: z.string().default('20'),

  // Search
  search: z.string().optional(),

  // Filters
  type: nativeEnum(HelpType).optional(),
  status: HelpFaqStatus.optional(),
  blogId: z.string().optional(),

  // Date range filters
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),

  // Sorting
  sortBy: SortBy.default('createdAt'),
  sortOrder: SortOrder.default('desc'),

  // Include soft deleted
  includeDeleted: IncludeDeleted,
});

export type HelpQueryDto = z.infer<typeof helpQuerySchema>;

// Response type for paginated results
export interface PaginatedHelpFaqResponse {
  data: any[];
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
    totalCount?: number;
  };
}
