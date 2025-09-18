import { z } from 'zod';

export const createSiteSettingSchema = z.object({
  siteName: z.string(),
  siteUrl: z.string(),
  siteLogo: z.string().optional(),
  siteFavicon: z.string().optional(),
  siteDescription: z.string().optional(),
  siteKeywords: z.string().optional(),
  siteEmail: z.string().optional(),
  sitePhone: z.string().optional(),
  siteAddress: z.string().optional(),
});

export type CreateSiteSettingDto = z.infer<typeof createSiteSettingSchema>;

export const updateSiteSettingSchema = createSiteSettingSchema.partial();
export type UpdateSiteSettingDto = z.infer<typeof updateSiteSettingSchema>;
