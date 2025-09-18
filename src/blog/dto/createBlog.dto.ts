import { z } from 'zod';

export const CreateBlogSchema = z.object({
  title: z.string().min(5).max(255),
  slug: z.string().min(1).max(255), // Must be unique; uniqueness check should be server-side
  content: z.string().min(1),
  excerpt: z.string().max(500).optional().nullable(),
  // Stored as a file key/path, not necessarily a URL
  coverImage: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  publishedAt: z.date().optional().nullable(),
  // Coerce string values from multipart/form-data (e.g., "true"/"false") to boolean
  isFeatured: z.coerce.boolean().optional().default(false),
  isDeleted: z.coerce.boolean().optional().default(false),

  // Will be injected from the authenticated request context
  authorId: z.string().min(1).optional(), // Assuming ULID or UUID

  // Accept either a single string or an array of strings and normalize to array
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : undefined)),
  categories: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : undefined)),

  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  ogTitle: z.string().max(70).optional().nullable(),
  ogDescription: z.string().max(160).optional().nullable(),
  // Accept either a comma-separated string or an array from FormData, normalize to string
  metaKeywords: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .nullable()
    .transform((v) => (Array.isArray(v) ? v.join(',') : (v ?? null))),
  robotsFollow: z.coerce.boolean().optional().default(true),
  robotsIndex: z.coerce.boolean().optional().default(true),
});

export type CreateBlogDto = z.infer<typeof CreateBlogSchema>;
