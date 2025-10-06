import { z } from 'zod';

export const createWishlistSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type CreateWishlistDto = z.infer<typeof createWishlistSchema>;
