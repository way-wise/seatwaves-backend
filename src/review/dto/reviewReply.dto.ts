import { z } from 'zod';

export const createReviewReplyScheam = z.object({
  reviewId: z.string().ulid(),
  reply: z.string(),
  status: z.string().optional(),
});

export const updateReviewReplyDto = createReviewReplyScheam.partial();

export type CreateReviewReplyDto = z.infer<typeof createReviewReplyScheam>;
export type UpdateReviewReplyDto = z.infer<typeof updateReviewReplyDto>;
