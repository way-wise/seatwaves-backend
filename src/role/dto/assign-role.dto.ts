import { z } from 'zod';

export const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
