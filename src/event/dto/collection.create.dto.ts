import { CollectionType } from '@prisma/client';
import { z } from 'zod';

export const createCollectionSchema = z.object({
  type: z.nativeEnum(CollectionType).default(CollectionType.WEBALERT),
  eventId: z.string(),
});

export type CreateCollectionDto = z.infer<typeof createCollectionSchema>;
