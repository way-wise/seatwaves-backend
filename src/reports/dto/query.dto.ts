import { z } from 'zod';

export const reportStatusEnum = z.enum([
  'PENDING',
  'IN_REVIEW',
  'ESCALATED',
  'RESOLVED',
  'REJECTED',
]);

export const reportSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const reportTypeEnum = z.enum([
  'FRAUD',
  'SCAM',
  'SPAM',
  'ABUSE',
  'PAYMENT_ISSUE',
  'BOOKING_ISSUE',
  'EVENT_ISSUE',
  'PLATFORM_BUG',
  'OTHER',
]);

export const reportTargetTypeEnum = z.enum([
  'USER',
  'BOOKING',
  'EVENT',
  'TRANSACTION',
  'MESSAGE',
  'OTHER',
]);

export const reportQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'status',
      'severity',
      'type',
      'targetType',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),

  // filters
  status: reportStatusEnum.optional(),
  severity: reportSeverityEnum.optional(),
  type: reportTypeEnum.optional(),
  targetType: reportTargetTypeEnum.optional(),
  reporterId: z.string().optional(),
  reportedUserId: z.string().optional(),
  assignedToId: z.string().optional(),
  bookingId: z.string().optional(),
  eventId: z.string().optional(),
  transactionId: z.string().optional(),
  messageId: z.string().optional(),

  search: z.string().optional(),
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
