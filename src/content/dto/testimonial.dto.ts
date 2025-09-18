import { z } from 'zod';

// Accept boolean-like values from multipart forms safely
// - true | 'true' | 1 | '1' => true
// - false | 'false' | 0 | '0' => false
const booleanLike = z.union([
  z.boolean(),
  z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1'),
]);

export const createTestimonialSchema = z.object({
  name: z.string().min(1).max(120),
  badgeTitle: z.string().max(120).optional(),
  designation: z.string().max(120).optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  position: z.string().max(50).optional(),
  isActive: booleanLike.optional(),
  // image comes via multipart file; we set resulting key in service
});

export type CreateTestimonialDto = z.infer<typeof createTestimonialSchema>;

export const updateTestimonialSchema = createTestimonialSchema.partial();
export type UpdateTestimonialDto = z.infer<typeof updateTestimonialSchema>;
