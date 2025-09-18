import { z } from 'zod';
import { ReviewStatusEnum } from '../../common/enums';

export const createReviewSchema = z.object({
  bookingId: z.string().ulid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  title: z.string().optional(),
});

export const updateReviewDto = createReviewSchema.partial();

export type createReviewDto = z.infer<typeof createReviewSchema>;
export type updateReviewDto = z.infer<typeof updateReviewDto>;
