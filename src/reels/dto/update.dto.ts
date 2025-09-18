// import { z } from 'zod';
// import { ReelPlatform } from '@prisma/client';

// const urlRegex = /^(https?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:\/?#\[\]@!$&'()*+,;=.]*$/i;

// export const updateReelsSchema = z
//   .object({
//     platform: z.nativeEnum(ReelPlatform).optional(),
//     videoId: z.string().trim().min(1).optional(), // can also be URL; service normalizes
//     title: z.string().trim().min(1).max(200).optional().nullable(),
//     description: z.string().trim().max(2000).optional().nullable(),
//     thumbnail: z.string().trim().regex(urlRegex, 'thumbnail must be a valid URL').optional().nullable(),
//     duration: z.number().int().positive().max(60 * 60 * 3).optional().nullable(),
//     isActive: z.boolean().optional(),
//   })
//   .refine(
//     (data) => Object.keys(data).length > 0,
//     { message: 'At least one field must be provided for update' },
//   );

// export type UpdateReelsDto = z.infer<typeof updateReelsSchema>;
