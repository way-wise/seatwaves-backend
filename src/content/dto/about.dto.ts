import { z } from 'zod';

export const createAboutSchema = z.object({
  heading: z.string().min(2).max(200),
  subHeading: z.string().max(300).optional(),
  content: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  // image comes from multipart file; we store resulting key in service
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

export type CreateAboutDto = z.infer<typeof createAboutSchema>;

export const updateAboutSchema = createAboutSchema.partial();
export type UpdateAboutDto = z.infer<typeof updateAboutSchema>;
