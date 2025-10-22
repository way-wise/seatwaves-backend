import { CollectionType } from '@prisma/client';
import z from 'zod';

export const collectionQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  cursor: z.string().optional(),
  type: z.nativeEnum(CollectionType).default(CollectionType.WEBALERT),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.string().optional().default('desc'),
});
