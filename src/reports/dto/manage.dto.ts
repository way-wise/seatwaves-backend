import { z } from 'zod';

export const reportStatusEnum = z.enum([
  'PENDING',
  'IN_REVIEW',
  'ESCALATED',
  'RESOLVED',
  'REJECTED',
]);

export const updateReportStatusSchema = z.object({
  status: reportStatusEnum,
  adminNotes: z.string().optional(),
});
export type UpdateReportStatusDto = z.infer<typeof updateReportStatusSchema>;

export const assignReportSchema = z.object({
  assignedToId: z.string().optional(),
});

export type AssignReportDto = z.infer<typeof assignReportSchema>;

export const updateNotesSchema = z.object({
  adminNotes: z.string().min(1),
});
export type UpdateNotesDto = z.infer<typeof updateNotesSchema>;
