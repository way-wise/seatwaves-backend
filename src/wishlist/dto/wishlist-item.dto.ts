import { z } from 'zod';

export const createWishlistItemSchema = z.object({
  experienceId: z.string().uuid(),
});

export type CreateWishlistItemDto = z.infer<typeof createWishlistItemSchema>;
