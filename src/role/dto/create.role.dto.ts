import { z } from 'zod';

export const createRolePermissionsSchema = z.object({
  name: z.string().min(1, { message: 'Role name is required' }),
  permissions: z
    .array(z.string())
    .min(1, { message: 'At least one permission is required' }),
});

export type CreateRolePermissionsDto = z.infer<
  typeof createRolePermissionsSchema
>;
