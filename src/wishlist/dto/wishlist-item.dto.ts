import { z } from 'zod';

export const createWishlistItemSchema = z.object({
  eventId: z.string().uuid(),
});

export type CreateWishlistItemDto = z.infer<typeof createWishlistItemSchema>;
