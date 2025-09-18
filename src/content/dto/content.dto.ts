import { z } from 'zod';

// Generic simple page schema: title + optional description/image/content + required SEO
export const createSimplePageSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  image: z.string().optional(), // comes from uploaded file; actual storage key is handled in service
  seo: z.object({
    metaTitle: z.string().min(2).max(70),
    metaDescription: z.string().max(160).optional(),
    metaKeywords: z.string().optional(),
    robotsIndex: z.coerce.boolean().optional(),
    robotsFollow: z.coerce.boolean().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: z.string().optional(),
    ogType: z.string().optional(),
    ogSiteName: z.string().optional(),
    structuredData: z.any().optional(),
  }),
});

export type CreateSimplePageDto = z.infer<typeof createSimplePageSchema>;
export const updateSimplePageSchema = createSimplePageSchema.partial();
export type UpdateSimplePageDto = z.infer<typeof updateSimplePageSchema>;

const booleanLike = z.union([
  z.boolean(),
  z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1'),
]);

// Banner schema (no SEO)
export const createBannerSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  image: z.string().optional(), // uploaded
  isActive: booleanLike.optional(),
});
export type CreateBannerDto = z.infer<typeof createBannerSchema>;
export const updateBannerSchema = createBannerSchema.partial();
export type UpdateBannerDto = z.infer<typeof updateBannerSchema>;

// Card schema (no SEO)
export const createCardSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  isActive: booleanLike.optional(),
  becomehostId: z.string().optional(),
});
export type CreateCardDto = z.infer<typeof createCardSchema>;
export const updateCardSchema = createCardSchema.partial();
export type UpdateCardDto = z.infer<typeof updateCardSchema>;
